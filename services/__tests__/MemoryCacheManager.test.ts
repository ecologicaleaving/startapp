import { MemoryCacheManager } from '../MemoryCacheManager';

describe('MemoryCacheManager', () => {
  let cache: MemoryCacheManager;

  beforeEach(() => {
    cache = new MemoryCacheManager(1, 10); // 1MB, 10 entries max for testing
  });

  describe('Basic Operations', () => {
    test('should store and retrieve data', () => {
      const testData = { name: 'Test Tournament', id: '1' };
      
      cache.set('test-key', testData, 60000);
      const result = cache.get('test-key');
      
      expect(result).toBeTruthy();
      expect(result?.data).toEqual(testData);
      expect(result?.accessCount).toBe(1);
    });

    test('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    test('should delete entries correctly', () => {
      cache.set('test-key', { data: 'test' }, 60000);
      
      expect(cache.get('test-key')).toBeTruthy();
      
      const deleted = cache.delete('test-key');
      expect(deleted).toBe(true);
      expect(cache.get('test-key')).toBeNull();
    });

    test('should clear all entries', () => {
      cache.set('key1', { data: 'test1' }, 60000);
      cache.set('key2', { data: 'test2' }, 60000);
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    test('should expire entries after TTL', async () => {
      cache.set('expire-test', { data: 'test' }, 100); // 100ms TTL
      
      expect(cache.get('expire-test')).toBeTruthy();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('expire-test')).toBeNull();
    }, 10000);

    test('should clean up expired entries', () => {
      // Add some entries with very short TTL
      cache.set('key1', { data: 'test1' }, 1); // 1ms TTL
      cache.set('key2', { data: 'test2' }, 60000); // Valid TTL
      
      // Wait for expiration
      setTimeout(() => {
        const cleanedCount = cache.cleanupExpired();
        expect(cleanedCount).toBe(1);
        expect(cache.get('key1')).toBeNull();
        expect(cache.get('key2')).toBeTruthy();
      }, 10);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entries when max entries exceeded', async () => {
      const cache = new MemoryCacheManager(50, 3); // Max 3 entries
      
      cache.set('key1', { data: 'test1' }, 60000);
      await new Promise(resolve => setTimeout(resolve, 1));
      cache.set('key2', { data: 'test2' }, 60000);
      await new Promise(resolve => setTimeout(resolve, 1));
      cache.set('key3', { data: 'test3' }, 60000);
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Access key1 to make it recently used
      cache.get('key1');
      await new Promise(resolve => setTimeout(resolve, 1));
      cache.get('key3');  // Make key3 more recently used than key2
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Add fourth entry, should evict key2 (least recently used)
      cache.set('key4', { data: 'test4' }, 60000);
      
      expect(cache.get('key1')).toBeTruthy();
      expect(cache.get('key2')).toBeNull(); // Should be evicted
      expect(cache.get('key3')).toBeTruthy();
      expect(cache.get('key4')).toBeTruthy();
    }, 10000);

    test('should update access statistics', async () => {
      cache.set('test-key', { data: 'test' }, 60000);
      
      const entry1 = cache.get('test-key');
      expect(entry1?.accessCount).toBe(1);
      
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const entry2 = cache.get('test-key');
      expect(entry2?.accessCount).toBe(2);
      expect(entry2?.lastAccessed).toBeGreaterThan(entry1?.lastAccessed || 0);
    }, 10000);
  });

  describe('Size Management', () => {
    test('should estimate entry sizes', () => {
      const smallData = { id: '1' };
      const largeData = { 
        id: '1', 
        description: 'A'.repeat(1000),
        items: new Array(100).fill('test data')
      };
      
      cache.set('small', smallData, 60000);
      cache.set('large', largeData, 60000);
      
      const stats = cache.getStats();
      expect(stats.currentSizeBytes).toBeGreaterThan(0);
    });

    test('should evict entries when size limit exceeded', () => {
      const cache = new MemoryCacheManager(0.001, 1000); // Very small size limit
      const largeData = { data: 'A'.repeat(10000) };
      
      cache.set('key1', largeData, 60000);
      cache.set('key2', largeData, 60000); // Should trigger size-based eviction
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1); // Should have evicted one entry
    });
  });

  describe('Statistics', () => {
    test('should provide accurate cache statistics', () => {
      cache.set('key1', { data: 'test1' }, 60000);
      cache.set('key2', { data: 'test2' }, 60000);
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.currentSizeBytes).toBeGreaterThan(0);
      expect(stats.maxEntries).toBe(10);
      expect(stats.utilizationPercent).toBeGreaterThan(0);
      expect(stats.entries).toHaveLength(2);
    });

    test('should include entry details in statistics', () => {
      cache.set('test-key', { data: 'test' }, 60000);
      cache.get('test-key'); // Access once
      
      const stats = cache.getStats();
      const entry = stats.entries.find(e => e.key === 'test-key');
      
      expect(entry).toBeTruthy();
      expect(entry?.accessCount).toBe(1);
      expect(entry?.isExpired).toBe(false);
      expect(entry?.size).toBeGreaterThan(0);
    });
  });

  describe('Key Pattern Matching', () => {
    test('should find keys by pattern', () => {
      cache.set('tournament_1', { data: 'test1' }, 60000);
      cache.set('tournament_2', { data: 'test2' }, 60000);
      cache.set('match_1', { data: 'test3' }, 60000);
      
      const tournamentKeys = cache.getKeysByPattern('tournament*');
      const matchKeys = cache.getKeysByPattern('match*');
      
      expect(tournamentKeys).toHaveLength(2);
      expect(tournamentKeys).toContain('tournament_1');
      expect(tournamentKeys).toContain('tournament_2');
      
      expect(matchKeys).toHaveLength(1);
      expect(matchKeys).toContain('match_1');
    });

    test('should handle complex patterns', () => {
      cache.set('tournaments_active_2025', { data: 'test1' }, 60000);
      cache.set('tournaments_finished_2024', { data: 'test2' }, 60000);
      cache.set('matches_live', { data: 'test3' }, 60000);
      
      const activeKeys = cache.getKeysByPattern('tournaments_active*');
      const finishedKeys = cache.getKeysByPattern('tournaments_finished*');
      
      expect(activeKeys).toHaveLength(1);
      expect(finishedKeys).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle setting same key multiple times', () => {
      cache.set('test-key', { data: 'version1' }, 60000);
      cache.set('test-key', { data: 'version2' }, 60000);
      
      const result = cache.get('test-key');
      expect(result?.data).toEqual({ data: 'version2' });
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    test('should handle null and undefined data', () => {
      cache.set('null-key', null, 60000);
      cache.set('undefined-key', undefined, 60000);
      
      expect(cache.get('null-key')?.data).toBeNull();
      expect(cache.get('undefined-key')?.data).toBeUndefined();
    });

    test('should handle empty string keys', () => {
      cache.set('', { data: 'empty-key-test' }, 60000);
      
      const result = cache.get('');
      expect(result?.data).toEqual({ data: 'empty-key-test' });
    });
  });
});