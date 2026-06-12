import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDebounce - Debounce a value
 * 
 * @param {*} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} Debounced value
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useDebouncedCallback - Debounce a callback function
 * 
 * @param {function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {function} Debounced callback
 */
export const useDebouncedCallback = (callback, delay = 300) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * useThrottle - Throttle a value
 * 
 * @param {*} value - Value to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {*} Throttled value
 */
export const useThrottle = (value, limit = 300) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = now;
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(timer);
    };
  }, [value, limit]);

  return throttledValue;
};

/**
 * useDebouncedState - State with debounced value
 * 
 * @param {*} initialValue - Initial state value
 * @param {number} delay - Debounce delay
 * @returns {array} [immediateValue, debouncedValue, setValue]
 */
export const useDebouncedState = (initialValue, delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, debouncedValue, setValue];
};

/**
 * useDebounceEffect - Effect that runs after debounce
 * 
 * @param {function} effect - Effect function
 * @param {array} deps - Dependencies
 * @param {number} delay - Debounce delay
 */
export const useDebounceEffect = (effect, deps, delay = 300) => {
  const callback = useCallback(effect, deps);
  const debouncedCallback = useDebouncedCallback(callback, delay);

  useEffect(() => {
    debouncedCallback();
  }, [debouncedCallback]);
};

export default useDebounce;
