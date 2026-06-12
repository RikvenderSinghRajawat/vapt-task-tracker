import { useState, useCallback, useMemo } from 'react';

/**
 * usePagination - Custom hook for paginated data handling
 * 
 * @param {array} data - Full dataset
 * @param {object} options - Configuration options
 * @returns {object} pagination state and helpers
 */
const usePagination = (data = [], options = {}) => {
  const {
    initialPage = 0,
    initialPageSize = 10,
    pageSizeOptions = [5, 10, 25, 50, 100]
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(data.length);

  // Update total count when data changes
  useMemo(() => {
    setTotalCount(data.length);
  }, [data]);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  // Calculate pagination metadata
  const paginationMeta = useMemo(() => {
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages - 1;
    const hasPrevPage = page > 0;
    const startItem = page * pageSize + 1;
    const endItem = Math.min((page + 1) * pageSize, totalCount);

    return {
      totalPages,
      hasNextPage,
      hasPrevPage,
      startItem,
      endItem,
      totalCount
    };
  }, [page, pageSize, totalCount]);

  // Go to specific page
  const goToPage = useCallback((newPage) => {
    const totalPages = Math.ceil(totalCount / pageSize);
    const clampedPage = Math.max(0, Math.min(newPage, totalPages - 1));
    setPage(clampedPage);
  }, [totalCount, pageSize]);

  // Go to next page
  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  // Go to previous page
  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  // Go to first page
  const firstPage = useCallback(() => {
    setPage(0);
  }, []);

  // Go to last page
  const lastPage = useCallback(() => {
    const totalPages = Math.ceil(totalCount / pageSize);
    setPage(Math.max(0, totalPages - 1));
  }, [totalCount, pageSize]);

  // Change page size
  const changePageSize = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(0); // Reset to first page when changing page size
  }, []);

  // Reset pagination
  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    // State
    page,
    pageSize,
    paginatedData,
    totalCount,
    
    // Metadata
    ...paginationMeta,
    
    // Actions
    setPage: goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize: changePageSize,
    reset,
    
    // Config
    pageSizeOptions
  };
};

/**
 * useCursorPagination - For cursor-based pagination
 * 
 * @param {function} fetchPage - Function to fetch a page of data
 * @param {object} options - Configuration options
 */
export const useCursorPagination = (fetchPage, options = {}) => {
  const { pageSize = 10 } = options;
  
  const [pages, setPages] = useState([{ data: [], cursor: null }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Load next page
  const loadNextPage = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentCursor = pages[currentPageIndex]?.cursor;
      const result = await fetchPage(currentCursor, pageSize);
      
      setPages(prev => [...prev, { 
        data: result.data, 
        cursor: result.nextCursor 
      }]);
      setHasMore(result.hasMore);
      setCurrentPageIndex(prev => prev + 1);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, pageSize, pages, currentPageIndex, loading, hasMore]);

  // Go to specific page
  const goToPage = useCallback((index) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index);
    }
  }, [pages.length]);

  const currentPage = pages[currentPageIndex];

  return {
    data: currentPage?.data || [],
    page: currentPageIndex,
    totalPages: pages.length,
    loading,
    error,
    hasMore,
    hasNextPage: currentPageIndex < pages.length - 1,
    hasPrevPage: currentPageIndex > 0,
    loadNextPage,
    goToPage,
    nextPage: () => {
      if (currentPageIndex < pages.length - 1) {
        setCurrentPageIndex(p => p + 1);
      } else {
        loadNextPage();
      }
    },
    prevPage: () => goToPage(currentPageIndex - 1),
    firstPage: () => goToPage(0),
    refresh: async () => {
      setPages([{ data: [], cursor: null }]);
      setCurrentPageIndex(0);
      setHasMore(true);
      await loadNextPage();
    }
  };
};

export default usePagination;
