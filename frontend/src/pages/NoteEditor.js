import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { keyframes } from '@emotion/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, IconButton, TextField, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl,
  InputLabel, Divider, Avatar, Stack, Switch, FormControlLabel, LinearProgress,
  List, ListItem, ListItemAvatar, ListItemText, Popover, Collapse, Badge
} from '@mui/material';
import {
  Add as AddIcon, Close as CloseIcon, Save as SaveIcon, Share as ShareIcon,
  Pin as PinIcon, PinOutlined as PinOutlinedIcon, Star as StarIcon, StarBorder as StarBorderIcon,
  Undo as UndoIcon, DeleteForever as PermanentDeleteIcon, FormatBold as BoldIcon,
  FormatItalic as ItalicIcon, FormatUnderlined as UnderlineIcon, FormatListBulleted as BulletIcon,
  FormatListNumbered as NumberListIcon, Code as CodeIcon, Link as LinkIcon,
  Title as HeadingIcon, CheckBox as CheckBoxIcon, PersonAdd as PersonAddIcon,
  Visibility as ViewIcon, Edit as EditAccessIcon, RemoveCircle as RemoveCircleIcon,
  People as PeopleIcon, Search as SearchIcon, Brush as BrushIcon,
  AccessTime as AccessTimeIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon,
  ContentCopy as CopyIcon, FormatColorText as TextColorIcon, Palette as PaletteIcon,
  KeyboardArrowLeft as BackIcon, MoreVert as MoreIcon, CloudDone as SavedIcon,
  CloudOff as UnsavedIcon, Sync as SyncIcon, WifiOff as OfflineIcon,
  FindInPage as SearchInNoteIcon, FiberManualRecord as RecordingIcon,
  KeyboardArrowUp as ChevronUpIcon, KeyboardArrowDown as ChevronDownIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { noteAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';
import { glassStyles, gradients, premiumColors } from '../theme/premiumTheme';
import socketService from '../services/socketService';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

const CATEGORIES = ['General', 'VAPT', 'Project', 'Meeting', 'Research', 'Development', 'Findings', 'Remediation', 'Commands', 'Checklist', 'Reference', 'Personal', 'Other'];
const STATUSES = ['Draft', 'Active', 'Archived'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const COLOR_LABELS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const autoSaveRef = useRef(null);
  const contentRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isNewNote = location.pathname === '/notes/new';
  const noteId = id || location.state?.noteId;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [form, setForm] = useState({
    title: '', content: '', category: 'General', priority: 'Medium',
    status: 'Draft', pinned: false, favorite: false, tags: [], colorLabel: '',
    description: ''
  });

  const [detailsOpen, setDetailsOpen] = useState(false);

  // Presence tracking
  const [activeUsers, setActiveUsers] = useState([]);
  const [editingUsers, setEditingUsers] = useState(new Set());

  // Search in note
  const [searchInNoteOpen, setSearchInNoteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Text color
  const [colorAnchorEl, setColorAnchorEl] = useState(null);

  const fetchNote = useCallback(async () => {
    if (!noteId || isNewNote) {
      setNote(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await noteAPI.getNote(noteId);
      setNote(data);
      setForm({
        title: data.title || '',
        content: data.content || '',
        category: data.category || 'General',
        priority: data.priority || 'Medium',
        status: data.status || 'Draft',
        pinned: data.pinned || false,
        favorite: data.favorite || false,
        tags: data.tags || [],
        colorLabel: data.colorLabel || '',
        description: data.description || ''
      });
    } catch (err) {
      showToast(err.message || 'Failed to load note', 'error');
      navigate('/notes');
    } finally {
      setLoading(false);
    }
  }, [noteId, isNewNote, showToast, navigate]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  const performSave = useCallback(async (dataToSave) => {
    setSaving(true);
    setIsSaving(true);
    try {
      const payload = { ...dataToSave, tags: (dataToSave.tags || []).filter(Boolean) };
      let saved;
      if (noteId && !isNewNote) {
        saved = await noteAPI.updateNote(noteId, payload);
      } else {
        saved = await noteAPI.createNote(payload);
        navigate(`/notes/${saved._id}`, { replace: true, state: { fromNew: true } });
      }
      setLastSaved(new Date());
      setNote(saved);
      return saved;
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
      throw err;
    } finally {
      setSaving(false);
      setIsSaving(false);
    }
  }, [noteId, isNewNote, navigate, showToast]);

  const handleManualSave = useCallback(() => {
    if (!form.title.trim()) {
      showToast('Title is required', 'warning');
      return;
    }
    return performSave(form);
  }, [form, performSave, showToast]);

  useEffect(() => {
    if (isNewNote || !noteId || !form.title.trim()) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      try {
        await performSave(form);
      } catch { /* silent */ }
    }, 3000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [form, noteId, isNewNote, performSave]);

  useEffect(() => {
    if (!noteId || isNewNote) return;
    const token = sessionStorage.getItem('vapt_access_token');
    if (!token) return;

    socketService.connect(token);
    socketService.joinNoteRoom(noteId, (response) => {
      if (response && response.existingUsers && Array.isArray(response.existingUsers)) {
        setActiveUsers(response.existingUsers.filter(u => u._id !== user._id));
      }
    });

    const unsubUpdated = socketService.on('note:updated', (data) => {
      if (data && data.noteId === noteId && data.updatedBy !== user._id) {
        setNote(data.note);
        setForm({
          title: data.note.title || '',
          content: data.note.content || '',
          category: data.note.category || 'General',
          priority: data.note.priority || 'Medium',
          status: data.note.status || 'Draft',
          pinned: data.note.pinned || false,
          favorite: data.note.favorite || false,
          tags: data.note.tags || [],
          colorLabel: data.note.colorLabel || '',
          description: data.note.description || ''
        });
        setLastSaved(new Date());
      }
    });

    const unsubUserJoined = socketService.on('note:user-joined', (data) => {
      if (data && data.noteId === noteId && data.user && data.user._id !== user._id) {
        setActiveUsers(prev => {
          const exists = prev.find(u => u._id === data.user._id);
          if (exists) return prev;
          return [...prev, { ...data.user, joinedAt: Date.now() }];
        });
      }
    });

    const unsubUserLeft = socketService.on('note:user-left', (data) => {
      if (data && data.noteId === noteId && data.userId !== user._id) {
        setActiveUsers(prev => prev.filter(u => u._id !== data.userId));
        setEditingUsers(prev => { const next = new Set(prev); next.delete(data.userId); return next; });
      }
    });

    const unsubUserEditing = socketService.on('note:user-editing', (data) => {
      if (data && data.noteId === noteId && data.userId !== user._id) {
        setEditingUsers(prev => {
          const next = new Set(prev);
          if (data.isEditing) next.add(data.userId);
          else next.delete(data.userId);
          return next;
        });
      }
    });

    return () => {
      socketService.leaveNoteRoom(noteId);
      socketService.cleanupNoteEditing(noteId);
      unsubUpdated();
      unsubUserJoined();
      unsubUserLeft();
      unsubUserEditing();
    };
  }, [noteId, isNewNote, user]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'content' && noteId && !isNewNote) {
      socketService.emitNoteEditing(noteId, true);
    }
  };

  const insertAtCursor = (prefix, suffix = '', defaultText = 'text') => {
    const textarea = contentRef.current;
    if (!textarea) {
      setForm(prev => ({ ...prev, content: prev.content + prefix + defaultText + suffix }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    let newContent, cursorPos;
    if (selected) {
      newContent = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
      cursorPos = start + prefix.length + selected.length + suffix.length;
    } else {
      newContent = text.substring(0, start) + prefix + defaultText + suffix + text.substring(end);
      cursorPos = start + prefix.length;
    }
    setForm(prev => ({ ...prev, content: newContent }));
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus();
        contentRef.current.setSelectionRange(cursorPos, selected ? cursorPos : cursorPos + defaultText.length);
      }
    }, 0);
  };

  const handleInsertBold = () => insertAtCursor('**', '**', 'bold text');
  const handleInsertItalic = () => insertAtCursor('*', '*', 'italic text');
  const handleInsertUnderline = () => insertAtCursor('__', '__', 'underlined text');
  const handleInsertHeading = () => insertAtCursor('\n# ', '', 'Heading');
  const handleInsertBullet = () => insertAtCursor('\n- ', '', 'List item');
  const handleInsertNumber = () => insertAtCursor('\n1. ', '', 'List item');
  const handleInsertCheckbox = () => insertAtCursor('\n- [ ] ', '', 'Task');
  const handleInsertCode = () => insertAtCursor('\n```\n', '\n```', 'code here');
  const handleInsertLink = () => insertAtCursor('[', '](url)', 'link text');

  const handleShare = async (userId, permission = 'view') => {
    try {
      await noteAPI.shareNote(noteId, { userId, permission });
      showToast('Note shared successfully', 'success');
      fetchNote();
      setShareDialogOpen(false);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleRemoveShare = async (userId) => {
    try {
      await noteAPI.removeShare(noteId, userId);
      showToast('Access removed', 'success');
      fetchNote();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleShareSearch = async (q) => {
    setShareSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const users = await noteAPI.searchUsers(q);
      setSearchResults(Array.isArray(users) ? users : []);
    } catch { setSearchResults([]); }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({ title: 'Delete Note', message: 'Move this note to the recycle bin?', confirmLabel: 'Delete', severity: 'warning' });
    if (!confirmed) return;
    try {
      await noteAPI.deleteNote(noteId);
      showToast('Note moved to recycle bin', 'success');
      navigate('/notes');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleTogglePin = async () => {
    try { await noteAPI.updateNote(noteId, { pinned: !note?.pinned }); fetchNote(); } catch { /* ignore */ }
  };
  const handleToggleFavorite = async () => {
    try { await noteAPI.updateNote(noteId, { favorite: !note?.favorite }); fetchNote(); } catch { /* ignore */ }
  };

  const handleInsertColor = (color) => {
    setForm(prev => ({ ...prev, content: prev.content + `{color:${color}}text{/color}` }));
    setColorAnchorEl(null);
  };

  const handleCopyContent = () => {
    if (form.content) {
      navigator.clipboard.writeText(form.content);
      showToast('Content copied', 'success');
    }
  };

  const handleSearchInNote = () => {
    setSearchInNoteOpen(!searchInNoteOpen);
    setSearchTerm('');
    setSearchMatchIndex(0);
    if (!searchInNoteOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const searchMatches = useMemo(() => {
    if (!searchTerm || !form.content) return [];
    const matches = [];
    const lower = form.content.toLowerCase();
    const term = searchTerm.toLowerCase();
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(term, idx);
      if (found === -1) break;
      matches.push(found);
      idx = found + 1;
    }
    return matches;
  }, [searchTerm, form.content]);

  const goToSearchMatch = (dir) => {
    if (searchMatches.length === 0) return;
    if (dir === 'next') {
      setSearchMatchIndex(prev => (prev + 1) % searchMatches.length);
    } else {
      setSearchMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length);
    }
  };

  const activeViewers = useMemo(() => {
    if (!activeUsers) return [];
    return activeUsers.filter(u => u._id && u._id !== user._id);
  }, [activeUsers, user]);

  const currentlyEditingName = useMemo(() => {
    if (editingUsers.size === 0 || !note?.sharedWith && !note?.owner) return null;
    const allUsers = [...(note?.sharedWith?.map(s => s.user) || []), note?.owner].filter(Boolean);
    for (const uid of editingUsers) {
      const u = allUsers.find(a => (a._id || a) === uid);
      if (u) return u.name || 'Someone';
    }
    return 'Someone';
  }, [editingUsers, note]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <LinearProgress sx={{ width: 200, borderRadius: 1 }} />
          <Typography sx={{ color: colors.text.tertiary }}>Loading note...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!isNewNote && !note) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h6" sx={{ color: colors.text.secondary }}>Note not found</Typography>
          <Button variant="contained" onClick={() => navigate('/notes')} sx={{ background: gradients.primary }}>Back to Notes</Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: colors.background.primary,
      p: { xs: 1.5, sm: 3, md: 4 },
      transition: 'all 0.3s ease'
    }}>
      <Card sx={{ ...glassStyles.card, mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <IconButton onClick={() => navigate('/notes')} sx={{ color: colors.text.secondary }}>
                <BackIcon />
              </IconButton>
            </Grid>
            <Grid item xs>
              <TextField fullWidth placeholder="Note title..." value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                inputProps={{ style: { fontWeight: 700, fontSize: '1.25rem', color: colors.text.primary } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md, '& fieldset': { border: 'none' } } }}
                variant="standard" />
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Save">
                  <IconButton onClick={handleManualSave} disabled={saving} sx={{ color: isSaving ? colors.severity.medium : colors.primary[400] }}>
                    {isSaving ? <SyncIcon sx={{ fontSize: 18, animation: 'spin 1s linear infinite' }} /> : <SaveIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={note?.pinned ? 'Unpin' : 'Pin'}>
                  <IconButton onClick={handleTogglePin} sx={{ color: note?.pinned ? colors.severity.medium : colors.text.tertiary }}>
                    {note?.pinned ? <PinIcon sx={{ fontSize: 18 }} /> : <PinOutlinedIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={note?.favorite ? 'Unfavorite' : 'Favorite'}>
                  <IconButton onClick={handleToggleFavorite} sx={{ color: note?.favorite ? colors.severity.high : colors.text.tertiary }}>
                    {note?.favorite ? <StarIcon sx={{ fontSize: 18 }} /> : <StarBorderIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share">
                  <IconButton onClick={() => setShareDialogOpen(true)} sx={{ color: colors.text.tertiary }}>
                    <ShareIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Details">
                  <IconButton onClick={() => setDetailsOpen(true)} sx={{ color: colors.text.tertiary }}>
                    <MoreIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton onClick={handleDelete} sx={{ color: colors.text.tertiary, '&:hover': { color: colors.severity.critical } }}>
                    <PermanentDeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                  <IconButton onClick={() => setIsFullscreen(!isFullscreen)} sx={{ color: colors.text.tertiary }}>
                    {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 18 }} /> : <FullscreenIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ ...glassStyles.card, mb: 2 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {[
              { icon: <BoldIcon sx={{ fontSize: 16 }} />, label: 'Bold', action: handleInsertBold },
              { icon: <ItalicIcon sx={{ fontSize: 16 }} />, label: 'Italic', action: handleInsertItalic },
              { icon: <UnderlineIcon sx={{ fontSize: 16 }} />, label: 'Underline', action: handleInsertUnderline },
              { icon: <HeadingIcon sx={{ fontSize: 16 }} />, label: 'Heading', action: handleInsertHeading },
              { icon: <BulletIcon sx={{ fontSize: 16 }} />, label: 'Bullet List', action: handleInsertBullet },
              { icon: <NumberListIcon sx={{ fontSize: 16 }} />, label: 'Number List', action: handleInsertNumber },
              { icon: <CheckBoxIcon sx={{ fontSize: 16 }} />, label: 'Checklist', action: handleInsertCheckbox },
              { icon: <CodeIcon sx={{ fontSize: 16 }} />, label: 'Code Block', action: handleInsertCode },
              { icon: <LinkIcon sx={{ fontSize: 16 }} />, label: 'Link', action: handleInsertLink },
            ].map((btn, i) => (
              <Tooltip key={i} title={btn.label} arrow>
                <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); btn.action(); }} sx={{ color: colors.text.secondary, '&:hover': { color: colors.primary[400], bgcolor: `${colors.primary[500]}10` } }}>
                  {btn.icon}
                </IconButton>
              </Tooltip>
            ))}
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: colors.border.subtle }} />
            <Tooltip title="Text Color" arrow>
              <IconButton size="small" onClick={e => setColorAnchorEl(e.currentTarget)} sx={{ color: colors.text.secondary, '&:hover': { color: colors.primary[400] } }}>
                <TextColorIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Search in Note" arrow>
              <IconButton size="small" onClick={handleSearchInNote} sx={{ color: searchInNoteOpen ? colors.primary[400] : colors.text.secondary, '&:hover': { color: colors.primary[400] } }}>
                <SearchInNoteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: colors.border.subtle }} />
            <Tooltip title="Copy Content" arrow>
              <IconButton size="small" onClick={handleCopyContent} sx={{ color: colors.text.secondary, '&:hover': { color: colors.primary[400] } }}>
                <CopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      {/* Search in Note Bar */}
      <Collapse in={searchInNoteOpen}>
        <Card sx={{ ...glassStyles.card, mb: 2 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <SearchInNoteIcon sx={{ fontSize: 18, color: colors.text.tertiary }} />
              <TextField size="small" placeholder="Search in note..." value={searchTerm}
                inputRef={searchInputRef}
                onChange={e => { setSearchTerm(e.target.value); setSearchMatchIndex(0); }}
                onKeyDown={e => { if (e.key === 'Enter') goToSearchMatch('next'); }}
                sx={{ minWidth: 250, '& input': { color: colors.text.primary, fontSize: '0.8rem' }, '& fieldset': { borderColor: colors.border.subtle } }} />
              {searchMatches.length > 0 && (
                <Typography variant="caption" sx={{ color: colors.text.tertiary, minWidth: 60 }}>
                  {searchMatchIndex + 1} of {searchMatches.length}
                </Typography>
              )}
              <IconButton size="small" onClick={() => goToSearchMatch('prev')} disabled={searchMatches.length === 0}
                sx={{ color: colors.text.secondary }}>
                <ChevronUpIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton size="small" onClick={() => goToSearchMatch('next')} disabled={searchMatches.length === 0}
                sx={{ color: colors.text.secondary }}>
                <ChevronDownIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton size="small" onClick={() => setSearchInNoteOpen(false)} sx={{ color: colors.text.tertiary }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      {/* Text Color Popover */}
      <Popover open={Boolean(colorAnchorEl)} anchorEl={colorAnchorEl} onClose={() => setColorAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { p: 1, bgcolor: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.md } }}>
        <Stack direction="row" spacing={0.5}>
          {COLOR_LABELS.map(cl => (
            <Box key={cl} onClick={() => handleInsertColor(cl)}
              sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: cl, cursor: 'pointer', border: '2px solid transparent', '&:hover': { transform: 'scale(1.2)', borderColor: colors.text.primary }, transition: 'all 0.15s' }} />
          ))}
        </Stack>
      </Popover>

      <Grid container spacing={3}>
        <Grid item xs={12} md={noteId ? 9 : 12}>
          <Card sx={{ ...glassStyles.card, height: '100%' }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <TextField fullWidth multiline minRows={isFullscreen ? 35 : 18} maxRows={50}
                placeholder="Start writing... Supports markdown: **bold**, *italic*, - lists, # headings, ```code```..."
                value={form.content}
                inputRef={contentRef}
                onChange={e => handleChange('content', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 0, '& fieldset': { border: 'none' } },
                  '& textarea': {
                    fontFamily: typography.fontFamily.mono, fontSize: '0.9rem', lineHeight: 1.7,
                    color: colors.text.primary, p: 3, resize: 'vertical'
                  }
                }}
                variant="outlined"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Stack spacing={2}>
            <Card sx={{ ...glassStyles.card }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" sx={{ color: colors.text.primary, fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Properties
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: colors.text.tertiary }}>Category</InputLabel>
                    <Select label="Category" value={form.category} onChange={e => handleChange('category', e.target.value)} sx={{ borderRadius: borderRadius.md }}>
                      {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: colors.text.tertiary }}>Priority</InputLabel>
                    <Select label="Priority" value={form.priority} onChange={e => handleChange('priority', e.target.value)} sx={{ borderRadius: borderRadius.md }}>
                      {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: colors.text.tertiary }}>Status</InputLabel>
                    <Select label="Status" value={form.status} onChange={e => handleChange('status', e.target.value)} sx={{ borderRadius: borderRadius.md }}>
                      {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <TextField fullWidth size="small" label="Description" placeholder="Brief description..." value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                    multiline rows={2}
                    sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary }, '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />

                  <Box>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>Tags</Typography>
                    <TextField fullWidth size="small" placeholder="Add tags (comma separated)" value={form.tags.join(', ')}
                      onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>Color Label</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Box onClick={() => handleChange('colorLabel', '')} sx={{ width: 20, height: 20, borderRadius: '50%', border: `1px solid ${colors.border.default}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloseIcon sx={{ fontSize: 10, color: colors.text.tertiary }} />
                      </Box>
                      {COLOR_LABELS.map(cl => (
                        <Box key={cl} onClick={() => handleChange('colorLabel', cl)} sx={{
                          width: 20, height: 20, borderRadius: '50%', bgcolor: cl, cursor: 'pointer',
                          border: form.colorLabel === cl ? `2px solid ${colors.text.primary}` : 'none',
                          transition: 'all 0.1s', '&:hover': { transform: 'scale(1.2)' }
                        }} />
                      ))}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={2}>
                    <FormControlLabel control={<Switch checked={form.pinned} onChange={e => handleChange('pinned', e.target.checked)} size="small" />}
                      label={<Typography variant="caption" sx={{ color: colors.text.secondary }}>Pinned</Typography>} />
                    <FormControlLabel control={<Switch checked={form.favorite} onChange={e => handleChange('favorite', e.target.checked)} size="small" />}
                      label={<Typography variant="caption" sx={{ color: colors.text.secondary }}>Favorite</Typography>} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {note && note.sharedWith?.length > 0 && (
              <Card sx={{ ...glassStyles.card }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" sx={{ color: colors.text.primary, fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Shared With ({note.sharedWith.length})
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={note.owner?.avatar} sx={{ width: 24, height: 24, bgcolor: colors.primary[500], fontSize: '0.6rem' }}>
                        {getInitials(note.owner?.name)}
                      </Avatar>
                      <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: 600 }}>{note.owner?.name}</Typography>
                      <Chip label="Owner" size="small" sx={{ height: 16, fontSize: '0.5rem', bgcolor: `${colors.primary[500]}20`, color: colors.primary[400] }} />
                    </Box>
                    {note.sharedWith.map((sw, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={sw.user?.avatar} sx={{ width: 24, height: 24, bgcolor: colors.secondary[500], fontSize: '0.6rem' }}>
                            {getInitials(sw.user?.name)}
                          </Avatar>
                          <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                            {sw.user?.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.3, alignItems: 'center' }}>
                          <Chip label={sw.permission === 'edit' ? 'Edit' : 'View'} size="small" sx={{
                            height: 16, fontSize: '0.5rem', fontWeight: 700,
                            bgcolor: sw.permission === 'edit' ? `${colors.severity.low}15` : `${colors.severity.medium}15`,
                            color: sw.permission === 'edit' ? colors.severity.low : colors.severity.medium
                          }} />
                          {note.owner?._id === user._id && (
                            <IconButton size="small" onClick={() => handleRemoveShare(sw.user?._id || sw.user)}
                              sx={{ color: colors.text.tertiary, '&:hover': { color: colors.severity.critical } }}>
                              <RemoveCircleIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Presence: Currently Viewing */}
            {activeViewers.length > 0 && (
              <Card sx={{ ...glassStyles.card }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" sx={{ color: colors.text.primary, fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <PeopleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
                    Currently Viewing ({activeViewers.length + 1})
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors.severity.low, border: `2px solid ${colors.background.secondary}` }} />}>
                        <Avatar src={user?.avatar} sx={{ width: 24, height: 24, bgcolor: colors.primary[500], fontSize: '0.6rem' }}>
                          {getInitials(user?.name)}
                        </Avatar>
                      </Badge>
                      <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: 600 }}>You</Typography>
                    </Box>
                    {activeViewers.map(au => (
                      <Box key={au._id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: editingUsers.has(au._id) ? colors.severity.high : colors.severity.low, border: `2px solid ${colors.background.secondary}` }} />}>
                          <Avatar src={au.avatar} sx={{ width: 24, height: 24, bgcolor: colors.secondary[500], fontSize: '0.6rem' }}>
                            {getInitials(au.name)}
                          </Avatar>
                        </Badge>
                        <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: 500 }}>
                          {au.name || 'User'}
                        </Typography>
                        {editingUsers.has(au._id) && (
                          <Chip icon={<RecordingIcon sx={{ fontSize: 10, animation: `${pulse} 1.5s infinite` }} />}
                            label="Editing" size="small" sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: `${colors.severity.high}15`, color: colors.severity.high, '& .MuiChip-icon': { ml: 0.3 } }} />
                        )}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Editing indicator (when no sidebar presence shown) */}
            {currentlyEditingName && activeViewers.length === 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                <RecordingIcon sx={{ fontSize: 12, color: colors.severity.high, animation: `${pulse} 1.5s infinite` }} />
                <Typography variant="caption" sx={{ color: colors.severity.high, fontWeight: 600 }}>
                  {currentlyEditingName} is editing...
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
              {lastSaved ? (
                <>
                  <SavedIcon sx={{ fontSize: 14, color: colors.severity.low }} />
                  <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
                    Last saved {formatDate(lastSaved)}
                  </Typography>
                </>
              ) : (
                <>
                  <UnsavedIcon sx={{ fontSize: 14, color: colors.text.tertiary }} />
                  <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
                    {isNewNote ? 'New note' : 'Unsaved changes'}
                  </Typography>
                </>
              )}
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { ...glassStyles.card, backgroundImage: 'none', bgcolor: premiumColors.background.secondary } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Note Details</Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {note && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Title</Typography>
                <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>{note.title}</Typography>
              </Box>
              {note.description && (
                <Box>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Description</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.3 }}>{note.description}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Owner</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Avatar src={note.owner?.avatar} sx={{ width: 28, height: 28, bgcolor: colors.primary[500], fontSize: '0.7rem' }}>
                    {getInitials(note.owner?.name)}
                  </Avatar>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{note.owner?.name}</Typography>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary }}>{note.owner?.email}</Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Category</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{note.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Priority</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{note.priority}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Status</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{note.status}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Version</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>v{note.version || 1}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Created</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{formatDate(note.createdAt)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Last Updated</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{formatDate(note.updatedAt)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Tags</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={0.5}>
                    {note.tags?.length > 0 ? note.tags.map(t => (
                      <Chip key={t} label={t} size="small" sx={{ fontSize: '0.7rem', color: colors.text.secondary, borderColor: colors.border.subtle }} />
                    )) : <Typography variant="body2" sx={{ color: colors.text.tertiary, fontStyle: 'italic' }}>No tags</Typography>}
                  </Stack>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 700 }}>Shared With</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{note.sharedWith?.length || 0} user(s)</Typography>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${colors.border.subtle}` }}>
          <Button onClick={() => setDetailsOpen(false)} sx={{ color: colors.text.secondary }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { ...glassStyles.card, backgroundImage: 'none', bgcolor: premiumColors.background.secondary } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShareIcon sx={{ fontSize: 20, color: colors.primary[400] }} /> Share Note
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField fullWidth label="Search users by name or email" placeholder="Type at least 2 characters..." value={shareSearch}
            onChange={e => handleShareSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.text.tertiary, mr: 1, fontSize: 18 }} /> }}
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />
          {searchResults.length > 0 && (
            <List sx={{ maxHeight: 300, overflow: 'auto', bgcolor: colors.background.tertiary, borderRadius: borderRadius.md }}>
              {searchResults.map(u => {
                const alreadyShared = note?.sharedWith?.some(s => (s.user?._id || s.user) === u._id);
                return (
                  <ListItem key={u._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View only">
                          <IconButton size="small" onClick={() => handleShare(u._id, 'view')} sx={{ color: colors.text.secondary, '&:hover': { color: colors.primary[400] } }} disabled={alreadyShared}>
                            <ViewIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit access">
                          <IconButton size="small" onClick={() => handleShare(u._id, 'edit')} sx={{ color: colors.text.secondary, '&:hover': { color: colors.severity.low } }} disabled={alreadyShared}>
                            <EditAccessIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }>
                    <ListItemAvatar>
                      <Avatar src={u.avatar} sx={{ bgcolor: colors.primary[500], width: 36, height: 36 }}>
                        {getInitials(u.name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 600 }}>{u.name}</Typography>}
                      secondary={<Typography variant="caption" sx={{ color: colors.text.tertiary }}>{u.email} · {u.role?.replace('_', ' ')}</Typography>} />
                  </ListItem>
                );
              })}
            </List>
          )}
          {shareSearch.length >= 2 && searchResults.length === 0 && (
            <Typography variant="body2" sx={{ color: colors.text.tertiary, textAlign: 'center', py: 4 }}>
              No users found matching "{shareSearch}"
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${colors.border.subtle}` }}>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ color: colors.text.secondary }}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NoteEditor;
