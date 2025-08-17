/**
 * Memory Cache Implementation
 * 
 * High-performance in-memory caching for AI model responses.
 */

import { CacheEntry, ModelResponse } from '../types';

export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttl: number = 3600) {
    this.maxSize = maxSize * 1024 * 1024; // Convert MB to bytes
    this.ttl = ttl * 1000; // Convert seconds to milliseconds
  }

  get(key: string): ModelResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.response;
  }

  set(key: string, response: ModelResponse): void {
    const entry: CacheEntry = {
      key,
      response,
      timestamp: Date.now(),
      ttl: this.ttl,
      hitCount: 0,
      size: JSON.stringify(response).length
    };

    this.cache.set(key, entry);
    this.cleanup();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);

    return {
      entries: this.cache.size,
      totalSize,
      totalHits,
      averageHits: entries.length > 0 ? totalHits / entries.length : 0
    };
  }

  private cleanup(): void {
    // Remove expired entries
    for (const [key, entry] of this.cache) {
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }

    // If still over size limit, remove LRU entries
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    if (totalSize > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      
      // Sort by last access time (timestamp + hitCount consideration)
      entries.sort((a, b) => {
        const aScore = a[1].timestamp + a[1].hitCount * 1000;
        const bScore = b[1].timestamp + b[1].hitCount * 1000;
        return aScore - bScore;
      });

      // Remove oldest 10%
      const toRemove = Math.ceil(entries.length * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}