// Simple in-memory cache with TTL support
class Cache {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  // Set cache with optional TTL (time to live in milliseconds)
  set(key, value, ttl = 60000) { // Default 1 minute
    this.cache.set(key, value);
    if (ttl) {
      this.ttls.set(key, Date.now() + ttl);
    }
  }

  // Get cached value
  get(key) {
    // Check if expired
    if (this.ttls.has(key)) {
      const expiry = this.ttls.get(key);
      if (Date.now() > expiry) {
        this.delete(key);
        return null;
      }
    }
    return this.cache.get(key) || null;
  }

  // Check if key exists and not expired
  has(key) {
    if (!this.cache.has(key)) return false;
    if (this.ttls.has(key)) {
      const expiry = this.ttls.get(key);
      if (Date.now() > expiry) {
        this.delete(key);
        return false;
      }
    }
    return true;
  }

  // Delete cached item
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  // Get cache stats
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const apiCache = new Cache();

// Helper function for cached API calls
export const withCache = async (key, fetchFn, ttl = 60000) => {
  // Check cache first
  const cached = apiCache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  apiCache.set(key, data, ttl);
  
  return data;
};

// Invalidate cache by key or pattern
export const invalidateCache = (pattern) => {
  if (typeof pattern === 'string') {
    apiCache.delete(pattern);
  } else if (pattern instanceof RegExp) {
    for (const key of apiCache.cache.keys()) {
      if (pattern.test(key)) {
        apiCache.delete(key);
      }
    }
  }
};

// Clear all cache
export const clearCache = () => {
  apiCache.clear();
};

// Get cache stats (for debugging)
export const getCacheStats = () => {
  return apiCache.stats();
};

export default apiCache;
