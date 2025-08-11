import NetworkStateManager, { ConnectionStrategy, NetworkState, ConnectionQuality } from '../NetworkStateManager';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()), // Return unsubscribe function
}));

// Mock fetch for latency measurement
global.fetch = jest.fn();

describe('NetworkStateManager', () => {
  let manager: NetworkStateManager;
  const NetInfo = require('@react-native-community/netinfo');

  beforeEach(() => {
    jest.clearAllMocks();
    NetworkStateManager.resetInstance();
    
    // Mock NetInfo responses
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
      details: {
        strength: 85,
        ssid: 'TestWiFi',
        bssid: '00:11:22:33:44:55',
      }
    });

    // Mock fetch for latency measurement
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    manager = NetworkStateManager.getInstance();
  });

  afterEach(() => {
    if (manager) {
      manager.cleanup();
    }
    NetworkStateManager.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NetworkStateManager.getInstance();
      const instance2 = NetworkStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Network State Detection', () => {
    it('should initialize with network state from NetInfo', async () => {
      // Wait for initialization
      await manager.waitForInitialization(1000);

      const networkState = manager.getCurrentNetworkState();
      expect(networkState).toMatchObject({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });
    }, 10000);

    it('should handle NetInfo initialization failure gracefully', async () => {
      NetworkStateManager.resetInstance();
      NetInfo.fetch.mockRejectedValue(new Error('Network error'));

      const failingManager = NetworkStateManager.getInstance();
      await failingManager.waitForInitialization(1000);

      const networkState = failingManager.getCurrentNetworkState();
      expect(networkState).toMatchObject({
        isConnected: false,
        type: 'unknown',
        isInternetReachable: false,
      });

      failingManager.cleanup();
    }, 10000);

    it('should map different network types correctly', async () => {
      const testCases = [
        { netInfoType: 'cellular', expected: 'cellular' },
        { netInfoType: 'wifi', expected: 'wifi' },
        { netInfoType: 'ethernet', expected: 'ethernet' },
        { netInfoType: 'bluetooth', expected: 'unknown' },
        { netInfoType: null, expected: 'unknown' },
      ];

      for (const testCase of testCases) {
        NetworkStateManager.resetInstance();
        NetInfo.fetch.mockResolvedValue({
          isConnected: true,
          type: testCase.netInfoType,
          isInternetReachable: true,
          details: {}
        });

        const testManager = NetworkStateManager.getInstance();
        await new Promise(resolve => setTimeout(resolve, 100));

        const networkState = testManager.getCurrentNetworkState();
        expect(networkState?.type).toBe(testCase.expected);

        testManager.cleanup();
      }
    });
  });

  describe('Connection Quality Assessment', () => {
    beforeEach(() => {
      // Mock successful fetch with 100ms latency
      const mockFetch = jest.fn().mockImplementation(() => {
        const startTime = Date.now();
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ ok: true });
          }, 100);
        });
      });
      global.fetch = mockFetch;
    });

    it('should assess connection quality correctly', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const quality = manager.getCurrentConnectionQuality();
      expect(quality).toBeTruthy();
      expect(quality?.score).toBeGreaterThan(0);
      expect(quality?.level).toBeTruthy();
      expect(quality?.recommendation).toBeTruthy();
    });

    it('should recommend different strategies based on quality', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // High quality connection should recommend aggressive strategy
      const quality = manager.getCurrentConnectionQuality();
      expect(quality?.recommendation).toBe(ConnectionStrategy.AGGRESSIVE_WEBSOCKET);
    });

    it('should handle latency measurement failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      await manager.forceQualityReassessment();
      
      const quality = manager.getCurrentConnectionQuality();
      expect(quality?.level).toBe('poor');
      expect(quality?.recommendation).toBe(ConnectionStrategy.POLLING_ONLY);
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff with jitter', () => {
      const delay1 = manager.getExponentialBackoffDelay(0, 1000);
      const delay2 = manager.getExponentialBackoffDelay(1, 1000);
      const delay3 = manager.getExponentialBackoffDelay(2, 1000);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay3).toBeGreaterThanOrEqual(1000);
      
      // Should have exponential growth trend (allowing for jitter)
      expect(delay2).toBeGreaterThan(delay1 * 0.8);
      expect(delay3).toBeGreaterThan(delay2 * 0.8);
    });

    it('should respect maximum delay', () => {
      const maxDelay = 5000;
      const delay = manager.getExponentialBackoffDelay(10, 1000, maxDelay);
      expect(delay).toBeLessThanOrEqual(maxDelay);
    });

    it('should have minimum delay of 1 second', () => {
      const delay = manager.getExponentialBackoffDelay(0, 100, 200);
      expect(delay).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Network Change Listeners', () => {
    it('should notify listeners of network state changes', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.addNetworkChangeListener(listener);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be called immediately with current state
      expect(listener).toHaveBeenCalled();

      // Simulate network change
      const mockListener = NetInfo.addEventListener.mock.calls[0][0];
      mockListener({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '4g' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      const unsubscribe = manager.addNetworkChangeListener(errorListener);

      // Should not throw
      expect(() => {
        const mockListener = NetInfo.addEventListener.mock.calls[0][0];
        mockListener({
          isConnected: false,
          type: 'none',
          isInternetReachable: false,
          details: {}
        });
      }).not.toThrow();

      unsubscribe();
    });
  });

  describe('Connection Strategy Configuration', () => {
    it('should return appropriate config for different strategies', () => {
      const aggressiveConfig = manager.getAdaptiveConnectionConfig(ConnectionStrategy.AGGRESSIVE_WEBSOCKET);
      const conservativeConfig = manager.getAdaptiveConnectionConfig(ConnectionStrategy.CONSERVATIVE_WEBSOCKET);
      const pollingConfig = manager.getAdaptiveConnectionConfig(ConnectionStrategy.POLLING_ONLY);

      expect(aggressiveConfig.reconnectDelay).toBeLessThan(conservativeConfig.reconnectDelay);
      expect(aggressiveConfig.heartbeatInterval).toBeLessThan(conservativeConfig.heartbeatInterval);
      expect(pollingConfig.pollInterval).toBeTruthy();
    });

    it('should use recommended strategy when none provided', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const config = manager.getAdaptiveConnectionConfig();
      expect(config).toBeTruthy();
      expect(config.reconnectDelay).toBeGreaterThan(0);
    });
  });

  describe('Network Type Optimizations', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    }, 10000);

    it('should identify when to use cellular optimizations', () => {
      // For Wi-Fi with good quality, should not use cellular optimizations
      expect(manager.shouldUseCellularOptimizations()).toBe(false);
    });

    it('should identify when network supports aggressive reconnection', () => {
      // Wi-Fi with good quality should support aggressive reconnection
      expect(manager.supportsAggressiveReconnection()).toBe(true);
    });

    it('should adjust recommendations for cellular networks', async () => {
      NetworkStateManager.resetInstance();
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '3g' }
      });

      const cellularManager = NetworkStateManager.getInstance();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(cellularManager.shouldUseCellularOptimizations()).toBe(true);
      expect(cellularManager.supportsAggressiveReconnection()).toBe(false);

      cellularManager.cleanup();
    });
  });

  describe('Connection Statistics', () => {
    it('should track connection statistics over time', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force multiple quality assessments
      await manager.forceQualityReassessment();
      await manager.forceQualityReassessment();

      const stats = manager.getConnectionStats();
      expect(stats.currentQuality).toBeGreaterThan(0);
      expect(stats.averageQuality).toBeGreaterThan(0);
      expect(stats.averageLatency).toBeGreaterThan(0);
      expect(['improving', 'stable', 'degrading']).toContain(stats.stabilityTrend);
    }, 15000);

    it('should determine stability trends correctly', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate improving connection quality
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 50))
      );

      // Force multiple assessments with improving latency
      for (let i = 0; i < 5; i++) {
        await manager.forceQualityReassessment();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const stats = manager.getConnectionStats();
      expect(stats.stabilityTrend).toBe('improving');
    }, 15000);
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      const unsubscribeListener = jest.fn();
      NetInfo.addEventListener.mockReturnValue(unsubscribeListener);

      const cleanupManager = NetworkStateManager.getInstance();
      cleanupManager.cleanup();

      expect(unsubscribeListener).toHaveBeenCalled();
    });

    it('should reset instance properly', () => {
      const instance1 = NetworkStateManager.getInstance();
      NetworkStateManager.resetInstance();
      const instance2 = NetworkStateManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });
});