/**
 * Performance Optimization Utilities
 * Web Workers, Memoization, Lazy Loading, and Caching
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Debounce Hook for performance optimization
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle Hook for limiting function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRan = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Memoization Cache for expensive computations
 */
class MemoCache<K, V> {
  private cache = new Map<string, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  private serialize(key: K): string {
    return JSON.stringify(key);
  }

  get(key: K): V | undefined {
    const serialized = this.serialize(key);
    const item = this.cache.get(serialized);
    
    if (!item) return undefined;
    
    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(serialized);
      return undefined;
    }
    
    return item.value;
  }

  set(key: K, value: V): void {
    const serialized = this.serialize(key);
    
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(serialized, {
      value,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Export cache instances for different use cases
export const embeddingCache = new MemoCache<string, number[]>(200, 10 * 60 * 1000); // 10 minutes
export const searchCache = new MemoCache<string, any>(50, 2 * 60 * 1000); // 2 minutes
export const documentCache = new MemoCache<string, any>(100, 15 * 60 * 1000); // 15 minutes

/**
 * Lazy Loading Hook for images and components
 */
export function useLazyLoad(ref: React.RefObject<HTMLElement>): boolean {
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [ref]);

  return isVisible;
}

/**
 * Batch Processing for large arrays
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    onProgress?.(Math.min(i + batchSize, items.length), items.length);
  }
  
  return results;
}

/**
 * Web Worker Utilities
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    data: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private activeWorkers = new Set<Worker>();

  constructor(
    workerScript: string | URL,
    poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript, { type: 'module' });
      this.workers.push(worker);
      
      worker.onmessage = (e) => {
        this.activeWorkers.delete(worker);
        this.processNextTask();
      };
      
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.activeWorkers.delete(worker);
        this.processNextTask();
      };
    }
  }

  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;
    
    const availableWorker = this.workers.find(w => !this.activeWorkers.has(w));
    if (!availableWorker) return;
    
    const task = this.taskQueue.shift();
    if (!task) return;
    
    this.activeWorkers.add(availableWorker);
    
    availableWorker.onmessage = (e) => {
      task.resolve(e.data);
      this.activeWorkers.delete(availableWorker);
      this.processNextTask();
    };
    
    availableWorker.onerror = (error) => {
      task.reject(error);
      this.activeWorkers.delete(availableWorker);
      this.processNextTask();
    };
    
    availableWorker.postMessage(task.data);
  }

  execute<T = any>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ data, resolve, reject });
      this.processNextTask();
    });
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.activeWorkers.clear();
    this.taskQueue = [];
  }
}

/**
 * Virtual Scrolling for large lists
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight);
    
    return {
      start: Math.max(0, start - 2), // Buffer
      end: Math.min(items.length, end + 2)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}

/**
 * Request Animation Frame Hook for smooth animations
 */
export function useAnimationFrame(callback: (deltaTime: number) => void, deps: any[] = []) {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  
  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, deps);
  
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
}

/**
 * Performance Monitoring
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();
  private measures: Array<{ name: string; duration: number }> = [];

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (start === undefined) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }
    
    const duration = (end || performance.now()) - start;
    this.measures.push({ name, duration });
    
    return duration;
  }

  getMeasures(): Array<{ name: string; duration: number }> {
    return [...this.measures];
  }

  clear(): void {
    this.marks.clear();
    this.measures = [];
  }

  report(): void {
    console.table(this.measures);
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Memory Management Utilities
 */
export function estimateObjectSize(obj: any): number {
  const seen = new WeakSet();
  
  function sizeOf(obj: any): number {
    if (obj === null) return 0;
    
    let bytes = 0;
    
    if (typeof obj === 'boolean') {
      bytes = 4;
    } else if (typeof obj === 'string') {
      bytes = obj.length * 2;
    } else if (typeof obj === 'number') {
      bytes = 8;
    } else if (typeof obj === 'object') {
      if (seen.has(obj)) {
        return 0;
      }
      seen.add(obj);
      
      if (Array.isArray(obj)) {
        bytes = obj.reduce((acc, item) => acc + sizeOf(item), 0);
      } else {
        bytes = Object.keys(obj).reduce((acc, key) => {
          return acc + sizeOf(key) + sizeOf(obj[key]);
        }, 0);
      }
    }
    
    return bytes;
  }
  
  return sizeOf(obj);
}

/**
 * Cleanup utility for removing large objects from memory
 */
export function cleanupLargeObjects(threshold: number = 10 * 1024 * 1024): void {
  // Clear caches
  embeddingCache.clear();
  searchCache.clear();
  documentCache.clear();
  
  // Force garbage collection if available (only in development)
  if ('gc' in global && typeof (global as any).gc === 'function') {
    (global as any).gc();
  }
}

// Import React for hooks
import * as React from 'react';
