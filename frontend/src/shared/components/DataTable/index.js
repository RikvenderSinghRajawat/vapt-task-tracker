import React, { useState, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Box,
  Typography,
  Checkbox,
  IconButton,
  Tooltip,
  Skeleton
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  UnfoldMore as UnfoldMoreIcon
} from '@mui/icons-material';
import { colors } from '../../../theme/designSystem';

/**
 * DataTable - Advanced data table with pagination, sorting, and selection
 * 
 * @param {array} columns - Column configuration
 * @param {array} data - Table data
 * @param {boolean} loading - Loading state
 * @param {boolean} selectable - Enable row selection
 * @param {array} selected - Selected row IDs
 * @param {function} onSelect - Selection callback
 * @param {function} onRowClick - Row click callback
 * @param {number} pageSize - Default page size
 * @param {object} sx - Additional styles
 */
const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  selectable = false,
  selected = [],
  onSelect,
  onRowClick,
  pageSize = 10,
  sx = {}
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle sorting
  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [data, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle select all
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      onSelect?.(data.map(row => row.id));
    } else {
      onSelect?.([]);
    }
  };

  // Handle row select
  const handleSelectRow = (id) => {
    const newSelected = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id];
    onSelect?.(newSelected);
  };

  // Get sort icon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <UnfoldMoreIcon sx={{ fontSize: 16, color: '#6E7681' }} />;
    }
    return sortConfig.direction === 'asc'
      ? <KeyboardArrowUpIcon sx={{ fontSize: 16, color: '#58A6FF' }} />
      : <KeyboardArrowDownIcon sx={{ fontSize: 16, color: '#58A6FF' }} />;
  };

  // Loading skeleton
  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={52}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: 2,
        overflow: 'hidden',
        ...sx
      }}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAll}
                    sx={{
                      color: colors.border.default,
                      '&.Mui-checked': { color: colors.primary[500] }
                    }}
                  />
                </TableCell>
              )}
              {columns.map(column => (
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  sx={{
                    borderBottom: `1px solid ${colors.border.subtle}`,
                    color: colors.text.secondary,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                    cursor: column.sortable ? 'pointer' : 'default',
                    '&:hover': column.sortable ? { color: colors.text.primary } : {}
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {column.title}
                    {column.sortable && getSortIcon(column.key)}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  align="center"
                  sx={{ py: 4, color: colors.text.tertiary }}
                >
                  <Typography variant="body2">
                    No data available
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={row.id || index}
                  hover
                  selected={selected.includes(row.id)}
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: `${colors.background.tertiary} !important`
                    },
                    '&.Mui-selected': {
                      backgroundColor: `${colors.primary[900]}40 !important`
                    }
                  }}
                >
                  {selectable && (
                    <TableCell padding="checkbox" sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row.id);
                        }}
                        sx={{
                          color: colors.border.default,
                          '&.Mui-checked': { color: colors.primary[500] }
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map(column => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'left'}
                      sx={{
                        borderBottom: `1px solid ${colors.border.subtle}`,
                        color: colors.text.primary,
                        fontSize: '0.875rem'
                      }}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={data.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        sx={{
          borderTop: `1px solid ${colors.border.subtle}`,
          color: colors.text.secondary,
          '& .MuiTablePagination-select': { color: colors.text.primary },
          '& .MuiTablePagination-selectIcon': { color: colors.text.secondary }
        }}
      />
    </Paper>
  );
};

export { DataTable };
export default DataTable;
