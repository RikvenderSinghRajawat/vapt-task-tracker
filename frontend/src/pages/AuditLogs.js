import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  Button,
  Tooltip,
  Skeleton,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { getAuditLogs, AUDIT_TYPES } from '../services/auditLogService';
import { useAuth } from '../context/AuthContext';
import premiumTheme, { premiumColors, glassStyles } from '../theme/premiumTheme';
import { DashboardHeader } from '../components/branding';
import GlassCard from '../components/premium/GlassCard';

const severityColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
};

const getEventColor = (type = '') => {
  const colors = premiumColors || premiumTheme?.colors;
  if (!type) return colors?.text?.muted || '#64748b';
  const eventType = String(type);
  if (eventType.includes('CREATE')) return colors?.severity?.medium?.main || '#eab308';
  if (eventType.includes('UPDATE')) return colors?.severity?.low?.main || '#22c55e';
  if (eventType.includes('DELETE')) return colors?.severity?.critical?.main || '#ef4444';
  if (eventType.includes('APPROVE')) return colors?.severity?.low?.main || '#22c55e';
  if (eventType.includes('REJECT')) return colors?.severity?.high?.main || '#f97316';
  if (eventType.includes('LOGIN')) return '#3b82f6';
  if (eventType.includes('LOGOUT')) return '#64748b';
  return colors?.text?.muted || '#64748b';
};

const AuditLogs = () => {
  const { user } = useAuth();
  const colors = premiumColors || premiumTheme?.colors;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(25);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        ...filters,
        limit: 500,
      });
      setLogs(data);
      setTotalLogs(data.length);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleResetFilters = () => {
    setFilters({ type: '', userId: '', startDate: '', endDate: '' });
    setPage(1);
    fetchLogs();
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'User', 'Role', 'Project ID', 'Finding ID', 'Details'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.type,
        log.userEmail,
        log.userRole,
        log.projectId || '-',
        log.findingId || '-',
        JSON.stringify(log.details || {}).replace(/,/g, ';'),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pagination
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedLogs = logs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(logs.length / rowsPerPage);

  const auditTypeOptions = Object.entries(AUDIT_TYPES).map(([key, value]) => ({
    label: key.replace(/_/g, ' ').toLowerCase(),
    value,
  }));

  return (
    <Box sx={{ p: 3 }}>
      <DashboardHeader title="Audit Logs" subtitle="Track all system activities and user actions" />

      {/* Filters */}
      <GlassCard sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: '#94a3b8' }}>Event Type</InputLabel>
            <Select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              sx={{
                color: '#f8fafc',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              {auditTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="From Date"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiInputBase-input': { color: '#f8fafc' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
            }}
          />

          <TextField
            label="To Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiInputBase-input': { color: '#f8fafc' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
            }}
          />

          <Button
            variant="contained"
            onClick={handleApplyFilters}
            startIcon={<FilterIcon />}
            sx={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              textTransform: 'none',
            }}
          >
            Apply Filters
          </Button>

          <Button
            variant="outlined"
            onClick={handleResetFilters}
            startIcon={<ClearIcon />}
            sx={{ textTransform: 'none', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            Reset Filters
          </Button>

          <Button
            variant="outlined"
            onClick={handleExport}
            startIcon={<DownloadIcon />}
            sx={{ textTransform: 'none', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)', ml: 'auto' }}
          >
            Export CSV
          </Button>
        </Box>
      </GlassCard>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <GlassCard>
          <Typography variant="h6" sx={{ color: '#f8fafc' }}>{logs.length}</Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Total Events</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="h6" sx={{ color: colors?.severity?.critical?.main || '#ef4444' }}>
            {logs.filter(l => l.type?.includes('DELETE')).length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Delete Actions</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="h6" sx={{ color: colors?.severity?.medium?.main || '#eab308' }}>
            {logs.filter(l => l.type?.includes('CREATE')).length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Create Actions</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="h6" sx={{ color: colors?.severity?.low?.main || '#22c55e' }}>
            {logs.filter(l => l.type?.includes('UPDATE')).length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Update Actions</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="h6" sx={{ color: colors?.severity?.info?.main || '#3b82f6' }}>
            {logs.filter(l => l.type?.includes('LOGIN')).length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Login Events</Typography>
        </GlassCard>
      </Box>

      {/* Logs Table */}
      <Paper sx={{ ...glassStyles.card, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Timestamp</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Event Type</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Details</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /></TableCell>
                    <TableCell><Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /></TableCell>
                    <TableCell><Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /></TableCell>
                    <TableCell><Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /></TableCell>
                    <TableCell><Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /></TableCell>
                    <TableCell><Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /></TableCell>
                  </TableRow>
                ))
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ color: '#f8fafc' }}>
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(log.type || 'unknown').replace(/_/g, ' ').toLowerCase()}
                        size="small"
                        sx={{
                          backgroundColor: `${getEventColor(log.type)}20`,
                          color: getEventColor(log.type),
                          textTransform: 'capitalize',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#f8fafc' }}>
                      {log.userEmail}
                    </TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>
                      {log.userRole}
                    </TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <Tooltip title={JSON.stringify(log.details, null, 2)}>
                          <Typography variant="body2" sx={{ cursor: 'pointer' }}>
                            {Object.keys(log.details)[0]}: {Object.values(log.details)[0]}
                          </Typography>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" sx={{ color: '#94a3b8' }}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': { color: '#94a3b8' },
                '& .Mui-selected': { backgroundColor: '#06b6d4' },
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AuditLogs;
