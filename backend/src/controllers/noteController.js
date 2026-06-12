const Note = require('../models/Note');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

const asObjectId = (id) => {
  if (!id) return null;
  try { return new mongoose.Types.ObjectId(id); }
  catch (e) { return null; }
};

// ====== ACCESS CONTROL HELPER ======
const canAccessNote = async (noteId, userId) => {
  const note = await Note.findById(noteId);
  if (!note) return null;
  const uid = userId.toString();
  if (note.owner.toString() === uid) return { note, access: 'owner' };
  const shared = note.sharedWith.find(s => s.user.toString() === uid);
  if (shared) return { note, access: shared.permission };
  return null;
};

// ====== BUILD FILTER ======
const buildNoteFilter = (req, query = {}) => {
  const userId = req.user._id;
  // Security: user sees own notes OR notes shared with them
  const filters = [
    { owner: userId, deletedAt: null },
    { 'sharedWith.user': userId, deletedAt: null }
  ];

  let sharedBase = { deletedAt: null, 'sharedWith.user': userId };
  let ownedBase = { owner: userId, deletedAt: null };

  const applyFilter = (base) => {
    const f = { ...base };
    if (query.category) f.category = query.category;
    if (query.priority) f.priority = query.priority;
    if (query.status) f.status = query.status;
    if (query.pinned === 'true') f.pinned = true;
    if (query.pinned === 'false') f.pinned = false;
    if (query.search) {
      f.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { content: { $regex: query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(query.search, 'i')] } }
      ];
    }
    if (query.tags) {
      const tags = Array.isArray(query.tags) ? query.tags : query.tags.split(',').map(t => t.trim());
      f.tags = { $in: tags };
    }
    if (query.startDate || query.endDate) {
      f.createdAt = {};
      if (query.startDate) f.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        f.createdAt.$lte = end;
      }
    }
    return f;
  };

  return {
    owned: applyFilter(ownedBase),
    shared: applyFilter(sharedBase),
    deleted: { owner: userId, deletedAt: { $ne: null } }
  };
};

// ====== SOCKET HELPER ======
const emitToNoteRoom = (noteId, event, data) => {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    io.to(`note:${noteId}`).emit(event, data);
  } catch (e) {
    // Socket may not be initialized in some environments
  }
};

const emitToUserRooms = (userId, event, data) => {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    io.to(`user:${userId}`).emit(event, data);
  } catch (e) { /* ignore */ }
};

// ====== GET NOTES LIST ======
exports.getNotes = async (req, res, next) => {
  try {
    const filters = buildNoteFilter(req, req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const scope = req.query.scope || 'all'; // all, owned, shared, deleted

    let $or = [];
    if (scope === 'owned' || scope === 'all') $or.push(filters.owned);
    if (scope === 'shared' || scope === 'all') $or.push(filters.shared);
    if (scope === 'deleted') {
      $or = [filters.deleted];
    }
    if (scope === 'pinned') {
      $or = [{ ...filters.owned, pinned: true }];
    }

    if ($or.length === 0) $or.push(filters.owned);

    let sort = { createdAt: -1 };
    if (req.query.sortBy === 'oldest') sort = { createdAt: 1 };
    else if (req.query.sortBy === 'updated') sort = { updatedAt: -1 };
    else if (req.query.sortBy === 'alpha') sort = { title: 1 };
    else if (req.query.sortBy === 'priority') sort = { priority: -1, createdAt: -1 };

    const [notes, total] = await Promise.all([
      Note.find({ $or })
        .populate('owner', 'name email avatar')
        .populate('sharedWith.user', 'name email avatar role')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Note.countDocuments({ $or })
    ]);

    res.status(200).json({
      success: true,
      data: {
        notes,
        pagination: { total, page, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ====== GET SINGLE NOTE ======
exports.getNote = async (req, res, next) => {
  try {
    const result = await canAccessNote(req.params.id, req.user._id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const note = await Note.findById(req.params.id)
      .populate('owner', 'name email avatar role')
      .populate('sharedWith.user', 'name email avatar role');

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ====== CREATE NOTE ======
exports.createNote = async (req, res, next) => {
  try {
    const noteData = {
      ...req.body,
      owner: req.user._id,
      lastEditedBy: req.user._id
    };

    // Clean up sharedWith if provided
    if (noteData.sharedWith) {
      noteData.sharedWith = noteData.sharedWith.map(s => ({
        user: s.user || s,
        permission: s.permission || 'view',
        sharedAt: new Date()
      }));
    }

    const note = await Note.create(noteData);

    await AuditLog.create({
      user: req.user._id,
      action: 'create_note',
      entityType: 'note',
      entityId: note._id,
      entityName: note.title,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const populated = await Note.findById(note._id)
      .populate('owner', 'name email avatar')
      .populate('sharedWith.user', 'name email avatar role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ====== UPDATE NOTE ======
exports.updateNote = async (req, res, next) => {
  try {
    const result = await canAccessNote(req.params.id, req.user._id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (result.access !== 'owner' && result.access !== 'edit') {
      return res.status(403).json({ success: false, message: 'You only have view access to this note' });
    }

    const updateData = { ...req.body };
    // Only owner can change ownership, sharing, delete
    if (result.access !== 'owner') {
      delete updateData.owner;
      delete updateData.sharedWith;
      delete updateData.deletedAt;
      delete updateData.deletedBy;
    }
    updateData.lastEditedBy = req.user._id;
    updateData.lastEditedAt = new Date();

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    Object.assign(note, updateData);
    await note.save();
    await note.populate('owner', 'name email avatar');
    await note.populate('sharedWith.user', 'name email avatar role');

    // Emit socket event to all note sharers and owner
    const recipients = [note.owner._id, ...note.sharedWith.map(s => s.user._id)];
    const uniqueRecipients = [...new Set(recipients.filter(r => r.toString() !== req.user._id.toString()))];
    uniqueRecipients.forEach(uid => emitToUserRooms(uid, 'note:updated', { noteId: note._id, note }));
    emitToNoteRoom(req.params.id, 'note:updated', { noteId: note._id, note, updatedBy: req.user._id });

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ====== DELETE NOTE (Soft) ======
exports.deleteNote = async (req, res, next) => {
  try {
    const result = await canAccessNote(req.params.id, req.user._id);
    if (!result || result.access !== 'owner') {
      return res.status(404).json({ success: false, message: 'Note not found or no permission to delete' });
    }

    result.note.deletedAt = new Date();
    result.note.deletedBy = req.user._id;
    await result.note.save();

    res.status(200).json({ success: true, message: 'Note moved to recycle bin' });
  } catch (error) {
    next(error);
  }
};

// ====== RESTORE NOTE ======
exports.restoreNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id, deletedAt: { $ne: null } });
    if (!note) return res.status(404).json({ success: false, message: 'Deleted note not found' });

    note.deletedAt = null;
    note.deletedBy = null;
    await note.save();

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ====== PERMANENTLY DELETE ======
exports.permanentDelete = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id, deletedAt: { $ne: null } });
    if (!note) return res.status(404).json({ success: false, message: 'Deleted note not found' });

    await Note.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Note permanently deleted' });
  } catch (error) {
    next(error);
  }
};

// ====== SHARE NOTE ======
exports.shareNote = async (req, res, next) => {
  try {
    const result = await canAccessNote(req.params.id, req.user._id);
    if (!result || result.access !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only the note owner can share this note' });
    }

    const { userId, permission } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot share note with yourself' });
    }

    const existingIndex = result.note.sharedWith.findIndex(s => s.user.toString() === userId);
    if (existingIndex >= 0) {
      // Update permission
      result.note.sharedWith[existingIndex].permission = permission || 'view';
      result.note.sharedWith[existingIndex].sharedAt = new Date();
    } else {
      // Add new share
      result.note.sharedWith.push({
        user: userId,
        permission: permission || 'view',
        sharedAt: new Date()
      });
    }

    await result.note.save();

    const populated = await Note.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('sharedWith.user', 'name email avatar role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ====== REMOVE SHARE ======
exports.removeShare = async (req, res, next) => {
  try {
    const result = await canAccessNote(req.params.id, req.user._id);
    if (!result || result.access !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only the note owner can manage sharing' });
    }

    const { userId } = req.params;
    result.note.sharedWith = result.note.sharedWith.filter(s => s.user.toString() !== userId);
    await result.note.save();

    res.status(200).json({ success: true, data: result.note });
  } catch (error) {
    next(error);
  }
};

// ====== GET SUMMARY ======
exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [myNotes, sharedNotes, recentNotes, pinnedNotes, draftNotes, deletedCount] = await Promise.all([
      Note.countDocuments({ owner: userId, deletedAt: null }),
      Note.countDocuments({ 'sharedWith.user': userId, deletedAt: null }),
      Note.find({ owner: userId, deletedAt: null }).sort({ updatedAt: -1 }).limit(5).select('title updatedAt'),
      Note.countDocuments({ owner: userId, deletedAt: null, pinned: true }),
      Note.countDocuments({ owner: userId, deletedAt: null, status: 'Draft' }),
      Note.countDocuments({ owner: userId, deletedAt: { $ne: null } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        myNotes,
        sharedNotes,
        recentNotes,
        pinnedNotes,
        draftNotes,
        deletedCount,
        lastEdited: recentNotes[0]?.updatedAt || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ====== SEARCH USERS FOR SHARING ======
exports.searchUsers = async (req, res, next) => {
  try {
    const query = req.query.q || '';
    if (!query || query.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const users = await User.find({
      deletedAt: null,
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('name email avatar role').limit(20);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// ====== GET NOTE ACTIVE USERS (for real-time awareness) ======
exports.getNoteActiveUsers = async (req, res, next) => {
  try {
    const result = await canAccessNote(req.params.id, req.user._id);
    if (!result) return res.status(404).json({ success: false, message: 'Note not found' });

    const note = await Note.findById(req.params.id).populate('lastEditedBy', 'name email avatar');
    res.status(200).json({
      success: true,
      data: {
        lastEditedBy: note.lastEditedBy || null,
        lastEditedAt: note.lastEditedAt,
        version: note.version
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export for tests
exports.canAccessNote = canAccessNote;