import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Divider, TablePagination,
  LinearProgress, Avatar, Stack, Switch, FormControlLabel, List, ListItem, ListItemAvatar,
  ListItemText, Select, MenuItem, FormControl, InputLabel, Autocomplete, Badge,
  Checkbox, Alert
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon,
  SaveAs as SaveIcon, Search as SearchIcon, Share as ShareIcon,
  Undo as UndoIcon, Star as StarIcon, StarBorder as StarBorderIcon,
  PushPin as PinIcon, PushPinOutlined as PinOutlinedIcon,
  MoreHoriz as MoreIcon,
  RemoveCircle as RemoveCircleIcon, Visibility as ViewIcon,
  AccessTime as AccessTimeIcon, NoteAlt as NotesIcon,
  People as PeopleIcon, DeleteSweep as DeleteSweepIcon,
  Edit as EditIconAlt, Refresh as RefreshIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { noteAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, typography, borderRadius } from '../theme/designSystem';
import { glassStyles, gradients, premiumColors } from '../theme/premiumTheme';


const COLOR_LABELS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const noteVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.2 } }),
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
};

const Notes = () => {
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();

  const [notes, setNotes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [scope, setScope] = useState('all');
  const [filters, setFilters] = useState({ search: '', sortBy: 'newest', tags: '' });
  const [selectedNote, setSelectedNote] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Editor state (inline page)
  const [editingId, setEditingId] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', pinned: false, favorite: false, tags: [], colorLabel: ''
  });
  const autoSaveRef = useRef(null);
  const editorRef = useRef(null);


  // Share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingNoteId, setSharingNoteId] = useState(null);
  const [shareSearch, setShareSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sharePermission, setSharePermission] = useState('view');
  const [sharedUsers, setSharedUsers] = useState([]);

  // ====== FETCH NOTES ======
  const fetchNotes = useCallback(async () => {
    try {
      const params = { ...filters, page: page + 1, limit: rowsPerPage, scope };
      const data = await noteAPI.getNotes(params);
      setNotes(data?.notes || []);
      setPagination(data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      showToast('Failed to load notes', 'error');
    }
  }, [filters, page, rowsPerPage, scope, showToast]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await noteAPI.getSummary();
      setSummary(data || null);
    } catch (err) { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ====== REAL-TIME POLLING for shared/scoped changes ======
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll when not editing and not viewing detail
      if (!isEditorOpen && !detailOpen) {
        fetchNotes();
        fetchSummary();
      }
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [fetchNotes, fetchSummary, isEditorOpen, detailOpen]);

  // ====== EDITOR ======
  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ title: '', content: '', pinned: false, favorite: false, tags: [], colorLabel: '' });
    setIsEditorOpen(true);
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleEdit = (note) => {
    setEditingId(note._id || note.id);
    setForm({
      title: note.title || '',
      content: note.content || '',
      pinned: note.pinned || false,
      favorite: note.favorite || false,
      tags: note.tags || [],
      colorLabel: note.colorLabel || ''
    });
    setIsEditorOpen(true);
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    try {
      const payload = { ...form, tags: form.tags.filter(Boolean) };
      if (editingId) {
        await noteAPI.updateNote(editingId, payload);
        showToast('Note updated', 'success');
      } else {
        await noteAPI.createNote(payload);
        showToast('Note created', 'success');
      }
      setIsEditorOpen(false);
      setEditingId(null);
      fetchNotes();
      fetchSummary();
    } catch (err) {
      showToast(err.message || 'Failed to save note', 'error');
    }
  };

  // Auto-save
  useEffect(() => {
    if (!editingId || !isEditorOpen) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (form.title.trim()) {
        try { await noteAPI.updateNote(editingId, form); } catch (e) { /* silent */ }
      }
    }, 5000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [form, editingId, isEditorOpen]);

  // ====== CRUD ======
  const handleDelete = async (id) => {
    const confirmed = await showConfirm({ title: 'Delete Note', message: 'Move this note to the recycle bin?', confirmLabel: 'Delete', severity: 'warning' });
    if (!confirmed) return;
    try {
      await noteAPI.deleteNote(id);
      showToast('Note moved to recycle bin', 'success');
      fetchNotes();
      fetchSummary();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleRestore = async (id) => {
    try {
      await noteAPI.restoreNote(id);
      showToast('Note restored', 'success');
      fetchNotes();
      fetchSummary();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handlePermanentDelete = async (id) => {
    const confirmed = await showConfirm({ title: 'Permanently Delete', message: 'This cannot be undone. Delete forever?', confirmLabel: 'Delete Forever', severity: 'critical' });
    if (!confirmed) return;
    try {
      await noteAPI.permanentDelete(id);
      showToast('Note permanently deleted', 'success');
      fetchNotes();
      fetchSummary();
    } catch (err) { showToast(err.message, 'error'); }
  };

  // ====== SHARING (MULTI-USER SUPPORT) ======
  const handleOpenShare = async (noteId) => {
    setSharingNoteId(noteId);
    setShareSearch('');
    setSearchResults([]);
    setSelectedUsers([]);
    setSharePermission('view');
    // Load current shared users
    try {
      const note = await noteAPI.getNote(noteId);
      setSharedUsers(note?.sharedWith || []);
    } catch { setSharedUsers([]); }
    setShareDialogOpen(true);
  };

  const handleShareSearch = async (q) => {
    setShareSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const users = await noteAPI.searchUsers(q);
      setSearchResults(Array.isArray(users) ? users : []);
    } catch { setSearchResults([]); }
  };

  const toggleUserSelection = (u) => {
    setSelectedUsers(prev => {
      const exists = prev.find(p => p._id === u._id);
      if (exists) return prev.filter(p => p._id !== u._id);
      return [...prev, u];
    });
  };

  const handleShareBulk = async () => {
    if (selectedUsers.length === 0) {
      showToast('Select at least one user to share with', 'warning');
      return;
    }
    try {
      for (const u of selectedUsers) {
        await noteAPI.shareNote(sharingNoteId, { userId: u._id, permission: sharePermission });
      }
      showToast(`Note shared with ${selectedUsers.length} user(s)`, 'success');
      setSelectedUsers([]);
      // Reload shared users
      const note = await noteAPI.getNote(sharingNoteId);
      setSharedUsers(note?.sharedWith || []);
      fetchNotes();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleRemoveShare = async (userId) => {
    try {
      await noteAPI.removeShare(sharingNoteId, userId);
      setSharedUsers(prev => prev.filter(s => (s.user?._id || s.user) !== userId));
      showToast('Access removed', 'success');
      fetchNotes();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleViewDetail = (note) => {
    setSelectedNote(note);
    setDetailOpen(true);
  };

  // ====== TOGGLES ======
  const handleTogglePin = async (note) => {
    try {
      await noteAPI.updateNote(note._id || note.id, { pinned: !note.pinned });
      fetchNotes();
    } catch { /* ignore */ }
  };

  const handleToggleFavorite = async (note) => {
    try {
      await noteAPI.updateNote(note._id || note.id, { favorite: !note.favorite });
      fetchNotes();
    } catch { /* ignore */ }
  };

  const updateFilter = (field, value) => {
    setPage(0);
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // ====== SORT ======
  const filteredNotes = useMemo(() => {
    let result = [...notes];
    if (filters.sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (filters.sortBy === 'updated') result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    else if (filters.sortBy === 'alpha') result.sort((a, b) => a.title.localeCompare(b.title));
    else result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }, [notes, filters.sortBy]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <LinearProgress sx={{ width: 200, borderRadius: 1 }} />
          <Typography sx={{ color: colors.text.tertiary, fontWeight: 500 }}>Loading Notes...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: { xs: 2, sm: 3, md: 4 } }}>
      {/* ===== HEADER ===== */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: 800, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NotesIcon sx={{ color: colors.primary[400], fontSize: 32 }} />
            Notes
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.tertiary, fontWeight: 500 }}>
            Personal & Shared Workspace — {scope === 'deleted' ? 'Recycle Bin' : scope === 'shared' ? 'Shared With Me' : scope === 'owned' ? 'My Notes' : 'All Notes'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {!isEditorOpen && (
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchNotes(); fetchSummary(); }}
              sx={{ borderColor: colors.border.default, color: colors.text.secondary, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
              Refresh
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}
            sx={{ background: gradients.primary, fontWeight: 700, borderRadius: borderRadius.lg, px: 3, py: 1, boxShadow: `0 8px 20px ${colors.primary[500]}40`, '&:hover': { transform: 'translateY(-2px)' }, transition: 'all 0.2s ease' }}>
            New Note
          </Button>
        </Box>
      </Box>

      {/* ===== SUMMARY CARDS ===== */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'My Notes', value: summary?.myNotes || 0, icon: <NotesIcon />, color: colors.primary[400], clickScope: 'owned' },
          { label: 'Shared With Me', value: summary?.sharedNotes || 0, icon: <PeopleIcon />, color: colors.secondary[400], clickScope: 'shared' },
          { label: 'Recycle Bin', value: summary?.deletedCount || 0, icon: <DeleteIcon />, color: colors.severity.critical, clickScope: 'deleted' },
        ].map((item, i) => (
          <Grid item xs={6} sm={4} md={2.4} key={i}>
            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card sx={{ ...glassStyles.card, cursor: item.clickScope ? 'pointer' : 'default', '&:hover': item.clickScope ? { ...glassStyles.cardHover } : {} }}
                onClick={() => { if (item.clickScope) { setPage(0); setScope(item.clickScope); setIsEditorOpen(false); } }}>
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, width: 36, height: 36, mx: 'auto', mb: 1 }}>{item.icon}</Avatar>
                  <Typography variant="h5" sx={{ color: colors.text.primary, fontWeight: 800, lineHeight: 1 }}>{item.value}</Typography>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 500 }}>{item.label}</Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* ===== FILTERS ===== */}
      {!isEditorOpen && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={0.5}>
            {['all', 'owned', 'shared', 'deleted'].map(s => (
              <Chip key={s} label={s === 'all' ? 'All' : s === 'owned' ? 'Mine' : s.charAt(0).toUpperCase() + s.slice(1)}
                size="small" onClick={() => { setPage(0); setScope(s); }}
                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 26, bgcolor: scope === s ? `${colors.primary[500]}20` : 'transparent', color: scope === s ? colors.primary[400] : colors.text.tertiary, border: `1px solid ${scope === s ? colors.primary[500] : 'transparent'}` }} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 200 }}>
            <TextField fullWidth size="small" placeholder="Search notes..." value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.text.tertiary, mr: 1, fontSize: 18 }} /> }}
              sx={{ '& input': { color: colors.text.primary }, '& fieldset': { borderColor: colors.border.subtle } }} />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select value={filters.sortBy} onChange={e => updateFilter('sortBy', e.target.value)}
                sx={{ color: colors.text.primary, borderRadius: borderRadius.lg }}>
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="oldest">Oldest</MenuItem>
                <MenuItem value="updated">Recent Edit</MenuItem>
                <MenuItem value="alpha">A-Z</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>
      )}

      {/* ===== NOTES GRID ===== */}
      {!isEditorOpen && (
        <AnimatePresence mode="popLayout">
          {filteredNotes.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10, ...glassStyles.card }}>
              <NotesIcon sx={{ fontSize: 64, color: colors.text.tertiary, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" sx={{ color: colors.text.secondary }}>No notes found</Typography>
              <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 3 }}>
                {scope === 'deleted' ? 'Recycle bin is empty' : 'Create a new note to get started'}
              </Typography>
              {scope !== 'deleted' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}
                  sx={{ background: gradients.primary, fontWeight: 700, borderRadius: borderRadius.lg }}>
                  Create Note
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredNotes.map((note, idx) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={note._id || note.id}>
                  <motion.div variants={noteVariants} initial="hidden" animate="visible" exit="exit" custom={idx} whileHover={{ y: -4 }}>
                    <Card sx={{
                      ...glassStyles.card, height: '100%', display: 'flex', flexDirection: 'column',
                      position: 'relative', overflow: 'hidden',
                      borderTop: note.colorLabel ? `3px solid ${note.colorLabel}` : 'none',
                      cursor: 'pointer', '&:hover': { ...glassStyles.cardHover, borderColor: note.colorLabel || colors.border.subtle }
                    }} onClick={() => handleViewDetail(note)}>
                      {/* Top bar */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1.5, pb: 0 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {note.pinned && <PinIcon sx={{ fontSize: 14, color: colors.severity.medium }} />}
                          {note.favorite && <StarIcon sx={{ fontSize: 14, color: colors.severity.high }} />}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.1 }} onClick={e => e.stopPropagation()}>
                          <IconButton size="small" onClick={() => handleTogglePin(note)} sx={{ color: colors.text.tertiary, '&:hover': { color: colors.severity.medium }, p: 0.5 }}>
                            {note.pinned ? <PinIcon sx={{ fontSize: 15 }} /> : <PinOutlinedIcon sx={{ fontSize: 15 }} />}
                          </IconButton>
                          <IconButton size="small" onClick={() => { handleEdit(note); }} sx={{ color: colors.text.tertiary, '&:hover': { color: colors.primary[400] }, p: 0.5 }}>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                          {scope !== 'deleted' && (
                            <IconButton size="small" onClick={() => handleDelete(note._id || note.id)} sx={{ color: colors.text.tertiary, '&:hover': { color: colors.severity.critical }, p: 0.5 }}>
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          )}
                        </Box>
                      </Box>

                      <CardContent sx={{ p: 2, pt: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                        <Typography variant="subtitle2" sx={{ color: colors.text.primary, fontWeight: 700, mb: 1, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {note.title}
                        </Typography>
                        {(note.description || note.content) && (
                          <Typography variant="body2" sx={{ color: colors.text.secondary, fontSize: '0.8rem', mb: 2, flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {(note.description || note.content).replace(/<[^>]*>/g, '').slice(0, 200)}
                          </Typography>
                        )}
                        {note.tags?.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                            {note.tags.slice(0, 3).map(t => (
                              <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', color: colors.text.tertiary, borderColor: colors.border.subtle }} />
                            ))}
                            {note.tags.length > 3 && <Typography variant="caption" sx={{ color: colors.text.tertiary }}>+{note.tags.length - 3}</Typography>}
                          </Box>
                        )}
                        <Divider sx={{ my: 0.5, borderColor: colors.border.subtle }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: 12, color: colors.text.tertiary }} />
                            <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: '0.65rem' }}>
                              {formatDate(note.updatedAt || note.createdAt)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            {scope !== 'deleted' && (
                              <Tooltip title="Share">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenShare(note._id || note.id); }}
                                  sx={{ color: colors.text.tertiary, '&:hover': { color: colors.primary[400] }, p: 0.3 }}>
                                  <ShareIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {scope === 'deleted' && (
                              <Chip label={`${note.daysUntilPermanentDelete || 0}d`} size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: `${colors.severity.critical}10`, color: colors.severity.critical }} />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </AnimatePresence>
      )}

      {/* ===== RECYCLE BIN ACTIONS ===== */}
      {scope === 'deleted' && filteredNotes.length > 0 && !isEditorOpen && (
        <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
          {filteredNotes.map(note => (
            <Box key={note._id || note.id} sx={{ display: 'inline-flex', gap: 0.5, bgcolor: colors.background.tertiary, borderRadius: borderRadius.lg, px: 1.5, py: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: colors.text.secondary, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {note.title}
              </Typography>
              <Tooltip title="Restore">
                <IconButton size="small" onClick={() => handleRestore(note._id || note.id)} sx={{ color: colors.severity.low, p: 0.3 }}>
                  <UndoIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete forever">
                <IconButton size="small" onClick={() => handlePermanentDelete(note._id || note.id)} sx={{ color: colors.severity.critical, p: 0.3 }}>
                  <DeleteSweepIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      {/* ===== PAGINATION ===== */}
      {pagination.pages > 1 && !isEditorOpen && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <TablePagination component="div" count={pagination.total} page={page}
            onPageChange={(e, np) => setPage(np)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => setRowsPerPage(parseInt(e.target.value, 10))}
            sx={{ color: colors.text.secondary, '& .MuiTablePagination-selectIcon': { color: colors.text.tertiary } }} />
        </Box>
      )}

      {/* ===== INLINE EDITOR ===== */}
      {isEditorOpen && (
        <Card ref={editorRef} sx={{ ...glassStyles.card, mb: 4, border: `1px solid ${colors.primary[500]}40` }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary }}>
                {editingId ? 'Edit Note' : 'New Note'}
              </Typography>
              <IconButton onClick={() => { setIsEditorOpen(false); setEditingId(null); }} sx={{ color: colors.text.tertiary }}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField fullWidth label="Title *" placeholder="Enter note title..." value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />
              </Grid>

              <Grid item xs={12}>
                <TextField fullWidth multiline rows={8} label="Content" placeholder="Write your note here..."
                  value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md }, '& textarea': { fontFamily: typography.fontFamily.mono, fontSize: '0.875rem', lineHeight: 1.6 } }} />
                <Typography variant="caption" sx={{ color: colors.text.tertiary, mt: 0.5, display: 'block' }}>
                  {editingId ? 'Auto-saved every 5 seconds' : 'Write your note'}
                </Typography>
              </Grid>

              {/* Tags */}
              <Grid item xs={12} sm={6}>
                <Autocomplete multiple freeSolo options={[]} value={form.tags}
                  onChange={(e, newVal) => setForm({ ...form, tags: newVal })}
                  renderInput={(params) => (
                    <TextField {...params} label="Tags" placeholder="Type and press Enter"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option} label={option} size="small"
                        sx={{ bgcolor: `${colors.primary[500]}15`, color: colors.primary[400], fontWeight: 600 }} />
                    ))
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />
              </Grid>

              {/* Color Label */}
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, display: 'block', mb: 1 }}>Color Label</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Box onClick={() => setForm({ ...form, colorLabel: '' })}
                    sx={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CloseIcon sx={{ fontSize: 14, color: colors.text.tertiary }} />
                  </Box>
                  {COLOR_LABELS.map(cl => (
                    <Box key={cl} onClick={() => setForm({ ...form, colorLabel: cl })}
                      sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: cl, cursor: 'pointer', border: form.colorLabel === cl ? `2px solid ${colors.text.primary}` : '2px solid transparent', transition: 'all 0.1s', '&:hover': { transform: 'scale(1.2)' } }} />
                  ))}
                </Box>
              </Grid>

              {/* Pinned & Favorite */}
              <Grid item xs={6} sm={1}>
                <FormControlLabel control={<Switch checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} sx={{ '& .MuiSwitch-track': { bgcolor: colors.border.default } }} />}
                  label={<Typography variant="caption" sx={{ color: colors.text.secondary }}>Pin</Typography>} />
              </Grid>
              <Grid item xs={6} sm={1}>
                <FormControlLabel control={<Switch checked={form.favorite} onChange={e => setForm({ ...form, favorite: e.target.checked })} sx={{ '& .MuiSwitch-track': { bgcolor: colors.border.default } }} />}
                  label={<Typography variant="caption" sx={{ color: colors.text.secondary }}>Fav</Typography>} />
              </Grid>
            </Grid>

            {/* Save Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, pt: 2, borderTop: `1px solid ${colors.border.subtle}` }}>
              <Typography variant="caption" sx={{ color: colors.text.tertiary, alignSelf: 'center' }}>
                {editingId ? `Auto-saving... Last: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Typography>
              <Button onClick={() => { setIsEditorOpen(false); setEditingId(null); }} sx={{ color: colors.text.secondary, textTransform: 'none' }}>Cancel</Button>
              <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />}
                sx={{ background: gradients.primary, fontWeight: 700, borderRadius: borderRadius.md, px: 4, textTransform: 'none' }}>
                {editingId ? 'Update Note' : 'Create Note'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { ...glassStyles.card, backgroundImage: 'none', bgcolor: premiumColors.background.secondary, border: `1px solid ${colors.border.subtle}` } }}>
        {selectedNote && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {selectedNote.pinned && <PinIcon sx={{ fontSize: 18, color: colors.severity.medium }} />}
                <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary }}>{selectedNote.title}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {scope !== 'deleted' && (
                  <>
                    <Tooltip title="Share">
                      <IconButton onClick={() => { handleOpenShare(selectedNote._id || selectedNote.id); }}
                        sx={{ color: colors.text.tertiary, '&:hover': { color: colors.primary[400] } }}>
                        <ShareIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => { setDetailOpen(false); handleEdit(selectedNote); }}
                        sx={{ color: colors.text.tertiary, '&:hover': { color: colors.primary[400] } }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                <IconButton onClick={() => setDetailOpen(false)} sx={{ color: colors.text.tertiary }}><CloseIcon /></IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ maxHeight: '70vh', overflow: 'auto', py: 3 }}>
              {selectedNote.favorite && (
                <Box sx={{ mb: 2 }}>
                  <StarIcon sx={{ color: colors.severity.high, fontSize: 18 }} />
                </Box>
              )}

              {/* Owner & time */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={selectedNote.owner?.avatar} sx={{ width: 24, height: 24, bgcolor: colors.primary[500], fontSize: '0.65rem' }}>
                    {getInitials(selectedNote.owner?.name)}
                  </Avatar>
                  <Typography variant="caption" sx={{ color: colors.text.secondary }}>{selectedNote.owner?.name || 'Unknown'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 14, color: colors.text.tertiary }} />
                  <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
                    {formatDate(selectedNote.createdAt)} · Updated {formatDate(selectedNote.updatedAt)}
                  </Typography>
                </Box>
              </Box>

              {/* Shared users */}
              {selectedNote.sharedWith?.length > 0 && (
                <Box sx={{ mb: 3, p: 2.5, bgcolor: `${colors.primary[500]}05`, borderRadius: borderRadius.md, border: `1px solid ${colors.primary[500]}15` }}>
                  <Typography variant="caption" sx={{ color: colors.primary[400], fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                    <PeopleIcon sx={{ fontSize: 14 }} /> Shared with {selectedNote.sharedWith.length} user(s)
                  </Typography>
                  <Stack spacing={1}>
                    {selectedNote.sharedWith.map((sw, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={sw.user?.avatar} sx={{ width: 28, height: 28, bgcolor: colors.secondary[500], fontSize: '0.6rem' }}>
                            {getInitials(sw.user?.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ color: colors.text.primary, fontSize: '0.8rem', fontWeight: 600 }}>
                              {sw.user?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: '0.65rem' }}>
                              {sw.permission === 'edit' ? 'Edit access' : 'View only'}
                            </Typography>
                          </Box>
                        </Box>
                        {(selectedNote.owner?._id === user._id || selectedNote.owner?.toString() === user._id) && (
                          <IconButton size="small" onClick={() => handleRemoveShare(sw.user?._id || sw.user)}
                            sx={{ color: colors.text.tertiary, '&:hover': { color: colors.severity.critical } }}>
                            <RemoveCircleIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Description */}
              {selectedNote.description && (
                <Box sx={{ mb: 2, p: 2, bgcolor: `${colors.primary[500]}05`, borderRadius: borderRadius.md }}>
                  <Typography variant="caption" sx={{ color: colors.primary[400], fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>Description</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary }}>{selectedNote.description}</Typography>
                </Box>
              )}

              {/* Content */}
              <Box sx={{
                p: 3, bgcolor: colors.background.tertiary, borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.subtle}`,
                whiteSpace: 'pre-wrap', fontFamily: typography.fontFamily.mono,
                fontSize: '0.875rem', lineHeight: 1.7, color: colors.text.primary, minHeight: 100
              }}>
                {selectedNote.content || 'No content'}
              </Box>

              {/* Tags */}
              {selectedNote.tags?.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>Tags</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedNote.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ color: colors.text.secondary, borderColor: colors.border.subtle }} />
                    ))}
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.border.subtle}`, gap: 1 }}>
              {scope !== 'deleted' && (
                <>
                  <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => { handleOpenShare(selectedNote._id || selectedNote.id); }}
                    sx={{ borderColor: colors.border.default, color: colors.text.primary, textTransform: 'none' }}>
                    Share
                  </Button>
                  <Button variant="outlined" startIcon={<EditIconAlt />} onClick={() => { setDetailOpen(false); handleEdit(selectedNote); }}
                    sx={{ borderColor: colors.border.default, color: colors.text.primary, textTransform: 'none' }}>
                    Edit
                  </Button>
                </>
              )}
              <Button onClick={() => setDetailOpen(false)} sx={{ color: colors.text.secondary, textTransform: 'none' }}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ===== SHARE DIALOG (MULTI-USER) ===== */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { ...glassStyles.card, backgroundImage: 'none', bgcolor: premiumColors.background.secondary, border: `1px solid ${colors.border.subtle}` } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShareIcon sx={{ fontSize: 20, color: colors.primary[400] }} /> Share Note
          </Typography>
          <IconButton onClick={() => setShareDialogOpen(false)} sx={{ color: colors.text.tertiary }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, minHeight: 350 }}>
          {/* Search users */}
          <TextField fullWidth placeholder="Search users by name or email..." value={shareSearch}
            onChange={e => handleShareSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.text.tertiary, mr: 1, fontSize: 18 }} /> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />

          {/* Permission selector */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel sx={{ color: colors.text.tertiary }}>Permission for selected users</InputLabel>
            <Select label="Permission for selected users" value={sharePermission} onChange={e => setSharePermission(e.target.value)}
              sx={{ color: colors.text.primary, borderRadius: borderRadius.lg }}>
              <MenuItem value="view">View only</MenuItem>
              <MenuItem value="edit">Edit access</MenuItem>
            </Select>
          </FormControl>

          {/* Share all button */}
          {selectedUsers.length > 0 && (
            <Alert severity="info" sx={{ mb: 2, bgcolor: `${colors.primary[500]}10`, color: colors.text.primary, '& .MuiAlert-icon': { color: colors.primary[400] } }}
              action={
                <Button size="small" variant="contained" onClick={handleShareBulk}
                  sx={{ background: gradients.primary, fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                  Share with {selectedUsers.length}
                </Button>
              }>
              {selectedUsers.length} user(s) selected
            </Alert>
          )}

          {/* Search results */}
          {searchResults.length > 0 ? (
            <List sx={{ maxHeight: 200, overflow: 'auto', bgcolor: colors.background.tertiary, borderRadius: borderRadius.md, mb: 2 }}>
              {searchResults.map(u => {
                const isSelected = selectedUsers.find(p => p._id === u._id);
                const alreadyShared = sharedUsers.find(s => (s.user?._id || s.user) === u._id);
                return (
                  <ListItem key={u._id} dense
                    sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }, opacity: alreadyShared ? 0.5 : 1 }}
                    secondaryAction={
                      alreadyShared ? (
                        <Chip label="Shared" size="small" sx={{ fontSize: '0.6rem', bgcolor: `${colors.severity.low}15`, color: colors.severity.low }} />
                      ) : (
                        <Checkbox checked={!!isSelected} onChange={() => toggleUserSelection(u)}
                          sx={{ color: colors.text.tertiary, '&.Mui-checked': { color: colors.primary[400] } }} />
                      )
                    }>
                    <ListItemAvatar>
                      <Avatar src={u.avatar} sx={{ bgcolor: colors.primary[500], width: 32, height: 32, fontSize: '0.7rem' }}>
                        {getInitials(u.name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 600, fontSize: '0.8rem' }}>{u.name}</Typography>}
                      secondary={<Typography variant="caption" sx={{ color: colors.text.tertiary }}>{u.email} · {u.role?.replace('_', ' ')}</Typography>} />
                  </ListItem>
                );
              })}
            </List>
          ) : shareSearch.length >= 2 ? (
            <Typography variant="body2" sx={{ color: colors.text.tertiary, textAlign: 'center', py: 3 }}>
              No users found matching "{shareSearch}"
            </Typography>
          ) : null}

          {/* Currently shared users */}
          {sharedUsers.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                Currently shared with ({sharedUsers.length})
              </Typography>
              <Stack spacing={0.5}>
                {sharedUsers.map((sw, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between', py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={sw.user?.avatar} sx={{ width: 24, height: 24, bgcolor: colors.secondary[500], fontSize: '0.55rem' }}>
                        {getInitials(sw.user?.name)}
                      </Avatar>
                      <Typography variant="caption" sx={{ color: colors.text.secondary, fontSize: '0.75rem' }}>
                        {sw.user?.name || 'Unknown'} · {sw.permission === 'edit' ? 'Edit' : 'View'}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveShare(sw.user?._id || sw.user)}
                      sx={{ color: colors.text.tertiary, '&:hover': { color: colors.severity.critical }, p: 0.3 }}>
                      <RemoveCircleIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.border.subtle}` }}>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ color: colors.text.secondary, textTransform: 'none' }}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notes;