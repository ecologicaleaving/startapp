import { MemoryCacheEntry } from '../types/cache';

/**
 * Memory cache manager with LRU (Least Recently Used) eviction policy
 * Manages in-memory cache with configurable size limits
 */
export class MemoryCacheManager {
  private cache: Map<string, MemoryCacheEntry> = new Map();
  private maxSize: number; // in MB
  private maxEntries: number;
  private currentSize: number = 0; // estimated size in bytes

  constructor(maxSize: number = 50, maxEntries: number = 1000) {
    this.maxSize = maxSize * 1024 * 1024; // Convert MB to bytes
    this.maxEntries = maxEntries;
  }

  /**
   * Get item from memory cache
   */
  get(key: string): MemoryCacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry;
  }

  /**
   * Set item in memory cache with TTL and size management
   */
  set(key: string, data: any, ttl: number): void {
    const entry: MemoryCacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    const estimatedSize = this.estimateSize(data);
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key);
      if (oldEntry) {
        this.currentSize -= this.estimateSize(oldEntry.data);
      }
    }

    // Ensure we have space
    this.ensureSpace(estimatedSize);

    // Add new entry
    this.cache.set(key, entry);
    this.currentSize += estimatedSize;

    // Enforce max entries limit
    if (this.cache.size > this.maxEntries) {
      this.evictLRU();
    }
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= this.estimateSize(entry.data);
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      currentSizeBytes: this.currentSize,
      currentSizeMB: this.currentSize / (1024 * 1024),
      maxSizeMB: this.maxSize / (1024 * 1024),
      maxEntries: this.maxEntries,
      utilizationPercent: (this.currentSize / this.maxSize) * 100,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        size: this.estimateSize(entry.data),
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed),
        isExpired: this.isExpired(entry)
      }))
    };
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: MemoryCacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Estimate memory size of data (rough approximation)
   */
  private estimateSize(data: any): number {
    if (data == null) return 8; // Rough size for null/undefined
    const jsonString = JSON.stringify(data);
    return jsonString.length * 2; // Rough estimate: 2 bytes per character in UTF-16
  }

  /**
   * Ensure we have enough space, evict if necessary
   */
  private ensureSpace(neededSize: number): void {
    while (this.currentSize + neededSize > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired(): number {
    let cleanedCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Get keys that match a pattern
   */
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }
}