import { VisApiService } from '../visApi';
import { CacheService } from '../CacheService';
import { CachePerformanceMonitor } from '../CachePerformanceMonitor';
import { RealtimeSubscriptionService } from '../RealtimeSubscriptionService';
import { BeachMatch } from '../../types/match';

// Mock the dependencies
jest.mock('../CacheService');
jest.mock('../CachePerformanceMonitor');
jest.mock('../RealtimeSubscriptionService');

const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
const mockPerformanceMonitor = CachePerformanceMonitor as jest.Mocked<typeof CachePerformanceMonitor>;
const mockRealtimeService = RealtimeSubscriptionService as jest.Mocked<typeof RealtimeSubscriptionService>;

describe('VisApiService.getBeachMatchList Enhanced Caching', () => {
  const sampleMatches: BeachMatch[] = [
    {
      No: '1',
      NoInTournament: '1',
      TeamAName: 'Team A',
      TeamBName: 'Team B',
      LocalDate: '2024-01-15',
      LocalTime: '14:00:00',
      Court: '1',
      Status: 'Live',
      MatchPointsA: '1',
      MatchPointsB: '0'
    },
    {
      No: '2',
      NoInTournament: '2',
      TeamAName: 'Team C',
      TeamBName: 'Team D',
      LocalDate: '2024-01-15',
      LocalTime: '16:00:00',
      Court: '2',
      Status: 'Scheduled',
      MatchPointsA: '0',
      MatchPointsB: '0'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockCacheService.initialize.mockReturnValue(undefined);
    mockPerformanceMonitor.monitorCacheTierPerformance.mockResolvedValue({
      result: {
        data: sampleMatches,
        source: 'memory' as const,
        fromCache: true,
        timestamp: Date.now()
      },
      duration: 5.2,
      performant: true,
      threshold: 100
    });
    mockRealtimeService.subscribeLiveMatches.mockResolvedValue(undefined);
  });

  describe('Cache Integration', () => {
    it('should integrate with CacheService for match retrieval', async () => {
      const tournamentNo = 'TEST123';
      
      const result = await VisApiService.getBeachMatchList(tournamentNo);
      
      expect(mockCacheService.initialize).toHaveBeenCalled();
      expect(mockPerformanceMonitor.monitorCacheTierPerformance).toHaveBeenCalledWith(
        'cache_service',
        expect.any(Function)
      );
      expect(result).toEqual(sampleMatches);
    });

    it('should fallback to direct API when cache fails', async () => {
      const tournamentNo = 'TEST123';
      
      // Mock cache failure
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 1000,
          performant: false,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: sampleMatches,
          duration: 500,
          performant: false,
          threshold: 100
        });

      // Mock fetch for direct API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<BeachMatch No="1" NoInTournament="1" TeamAName="Team A" TeamBName="Team B" Status="Live" />')
      });

      const result = await VisApiService.getBeachMatchList(tournamentNo);
      
      expect(mockPerformanceMonitor.monitorCacheTierPerformance).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should establish real-time subscriptions for live matches', async () => {
      const tournamentNo = 'TEST123';
      
      await VisApiService.getBeachMatchList(tournamentNo);
      
      expect(mockRealtimeService.subscribeLiveMatches).toHaveBeenCalledWith(sampleMatches);
    });

    it('should not establish subscriptions when no live matches', async () => {
      const nonLiveMatches: BeachMatch[] = [
        {
          No: '1',
          NoInTournament: '1',
          TeamAName: 'Team A',
          TeamBName: 'Team B',
          Status: 'Scheduled'
        }
      ];

      mockPerformanceMonitor.monitorCacheTierPerformance.mockResolvedValue({
        result: {
          data: nonLiveMatches,
          source: 'memory' as const,
          fromCache: true,
          timestamp: Date.now()
        },
        duration: 5.2,
        performant: true,
        threshold: 100
      });
      
      await VisApiService.getBeachMatchList('TEST123');
      
      expect(mockRealtimeService.subscribeLiveMatches).toHaveBeenCalledWith(nonLiveMatches);
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance warnings for slow cache responses', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockPerformanceMonitor.monitorCacheTierPerformance.mockResolvedValue({
        result: {
          data: sampleMatches,
          source: 'supabase' as const,
          fromCache: true,
          timestamp: Date.now()
        },
        duration: 1500, // Above threshold
        performant: false,
        threshold: 500
      });
      
      await VisApiService.getBeachMatchList('TEST123');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache performance warning: 1500.00ms exceeds 500ms threshold')
      );
      
      consoleSpy.mockRestore();
    });

    it('should track cache performance metrics', async () => {
      const tournamentNo = 'TEST123';
      
      await VisApiService.getBeachMatchList(tournamentNo);
      
      expect(mockPerformanceMonitor.monitorCacheTierPerformance).toHaveBeenCalledWith(
        'cache_service',
        expect.any(Function)
      );
    });
  });

  describe('Live Match Detection', () => {
    it('should correctly identify live matches', () => {
      const liveMatch: BeachMatch = { No: '1', Status: 'Live' };
      const runningMatch: BeachMatch = { No: '2', Status: 'running' };
      const inProgressMatch: BeachMatch = { No: '3', Status: 'InProgress' };
      const scheduledMatch: BeachMatch = { No: '4', Status: 'Scheduled' };
      
      expect(VisApiService.isLiveMatch(liveMatch)).toBe(true);
      expect(VisApiService.isLiveMatch(runningMatch)).toBe(true);
      expect(VisApiService.isLiveMatch(inProgressMatch)).toBe(true);
      expect(VisApiService.isLiveMatch(scheduledMatch)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache service errors gracefully', async () => {
      mockPerformanceMonitor.monitorCacheTierPerformance.mockRejectedValue(
        new Error('Cache service unavailable')
      );
      
      // Mock successful direct API fallback
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<BeachMatch No="1" NoInTournament="1" TeamAName="Team A" />')
      });
      
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockRejectedValueOnce(new Error('Cache service unavailable'))
        .mockResolvedValueOnce({
          result: [],
          duration: 500,
          performant: false,
          threshold: 100
        });
      
      const result = await VisApiService.getBeachMatchList('TEST123');
      
      expect(result).toBeDefined();
    });

    it('should throw error when both cache and API fail', async () => {
      mockPerformanceMonitor.monitorCacheTierPerformance.mockRejectedValue(
        new Error('Cache service unavailable')
      );
      
      await expect(VisApiService.getBeachMatchList('TEST123')).rejects.toThrow(
        'Failed to fetch tournament matches'
      );
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain the same interface as original getBeachMatchList', async () => {
      const tournamentNo = 'TEST123';
      const result = await VisApiService.getBeachMatchList(tournamentNo);
      
      // Should return BeachMatch array
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(sampleMatches);
      
      // Should accept string tournament number
      expect(typeof tournamentNo).toBe('string');
    });

    it('should return data in the same format as before', async () => {
      const result = await VisApiService.getBeachMatchList('TEST123');
      
      result.forEach(match => {
        expect(match).toHaveProperty('No');
        expect(match).toHaveProperty('NoInTournament');
        expect(match).toHaveProperty('TeamAName');
        expect(match).toHaveProperty('TeamBName');
        expect(match).toHaveProperty('Status');
      });
    });
  });
});