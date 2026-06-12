import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  TextField, 
  Button, 
  IconButton,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius, spacing } from '../../../theme/designSystem';
import { formatRelativeTime, formatDate } from '../../utils/formatters';

/**
 * CommentItem - Individual comment display
 */
const CommentItem = ({ 
  comment, 
  currentUser,
  onReply,
  onEdit,
  onDelete,
  depth = 0 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const isOwner = currentUser?.uid === comment.userId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleEdit = () => {
    setIsEditing(true);
    handleMenuClose();
  };

  const handleSaveEdit = () => {
    onEdit?.(comment.id, editContent);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(comment.id);
    handleMenuClose();
  };

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply?.(comment.id, replyContent);
      setReplyContent('');
      setShowReply(false);
    }
  };

  // Parse mentions in content
  const renderContent = (content) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention
        return (
          <Box
            key={index}
            component="span"
            sx={{
              color: colors.primary[400],
              fontWeight: typography.weight.semibold,
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            @{part}
          </Box>
        );
      }
      return part;
    });
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      mb: 2,
      ml: depth > 0 ? 4 : 0
    }}>
      <Avatar
        src={comment.userAvatar}
        alt={comment.userName}
        sx={{ 
          width: 36, 
          height: 36,
          backgroundColor: colors.primary[500]
        }}
      >
        {comment.userName?.charAt(0).toUpperCase()}
      </Avatar>

      <Box sx={{ flex: 1 }}>
        <Box sx={{ 
          backgroundColor: colors.background.tertiary,
          borderRadius: borderRadius.lg,
          p: 2,
          border: `1px solid ${colors.border.subtle}`
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            mb: 1 
          }}>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: typography.weight.semibold,
                  color: colors.text.primary,
                  fontSize: typography.size.sm
                }}
              >
                {comment.userName}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}
              >
                {formatRelativeTime(comment.createdAt)}
                {comment.editedAt && ' (edited)'}
              </Typography>
            </Box>

            {isOwner && (
              <>
                <IconButton 
                  size="small" 
                  onClick={handleMenuOpen}
                  sx={{ color: colors.text.tertiary }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: colors.background.secondary,
                      border: `1px solid ${colors.border.subtle}`
                    }
                  }}
                >
                  <MenuItem onClick={handleEdit} sx={{ color: colors.text.primary }}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit
                  </MenuItem>
                  <MenuItem onClick={handleDelete} sx={{ color: colors.severity.critical }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>

          {isEditing ? (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background.primary,
                    borderRadius: borderRadius.md
                  }
                }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}
            >
              {renderContent(comment.content)}
            </Typography>
          )}
        </Box>

        {/* Comment Actions */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1, ml: 1 }}>
          <Button
            size="small"
            startIcon={<ReplyIcon fontSize="small" />}
            onClick={() => setShowReply(!showReply)}
            sx={{ 
              color: colors.text.tertiary,
              fontSize: typography.size.xs,
              textTransform: 'none'
            }}
          >
            Reply
          </Button>
          
          {hasReplies && (
            <Typography
              variant="caption"
              sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}
            >
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </Typography>
          )}
        </Box>

        {/* Reply Input */}
        {showReply && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Avatar
              src={currentUser?.avatar}
              alt={currentUser?.name}
              sx={{ width: 32, height: 32 }}
            >
              {currentUser?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background.tertiary,
                    borderRadius: borderRadius.md
                  }
                }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setShowReply(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  endIcon={<SendIcon />}
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Nested Replies */}
        {hasReplies && (
          <Box sx={{ mt: 2 }}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUser={currentUser}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

/**
 * CommentThread - Main comment thread component
 */
const CommentThread = ({
  comments = [],
  currentUser,
  onAddComment,
  onReply,
  onEdit,
  onDelete,
  placeholder = "Add a comment... Use @ to mention users",
  maxLength = 2000
}) => {
  const [newComment, setNewComment] = useState('');
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment?.(newComment);
      setNewComment('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <Box>
      {/* Add Comment */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Avatar
          src={currentUser?.avatar}
          alt={currentUser?.name}
          sx={{ width: 40, height: 40 }}
        >
          {currentUser?.name?.charAt(0).toUpperCase()}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={placeholder}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.subtle}`,
                '&:focus-within': {
                  borderColor: colors.primary[500]
                }
              }
            }}
            helperText={`${newComment.length}/${maxLength} characters • Press Ctrl+Enter to send`}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!newComment.trim()}
            >
              Comment
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2, borderColor: colors.border.subtle }} />

      {/* Comments List */}
      <Box>
        {comments.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: colors.text.tertiary,
              py: 4
            }}
          >
            No comments yet. Be the first to comment!
          </Typography>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default CommentThread;
