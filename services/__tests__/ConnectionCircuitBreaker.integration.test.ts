import { ConnectionCircuitBreaker, CircuitState } from '../ConnectionCircuitBreaker';
import NetworkStateManager, { ConnectionStrategy } from '../NetworkStateManager';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock fetch for latency measurement
global.fetch = jest.fn();

describe('ConnectionCircuitBreaker Integration', () => {
  const NetInfo = require('@react-native-community/netinfo');
  let circuitBreaker: ConnectionCircuitBreaker;

  beforeEach(() => {
    jest.clearAllMocks();
    ConnectionCircuitBreaker.cleanupAll();
    NetworkStateManager.resetInstance();

    // Setup NetInfo mocks
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
      details: { strength: 80 }
    });

    // Mock successful fetch for latency measurement
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    circuitBreaker = ConnectionCircuitBreaker.getInstance('test-service');
  });

  afterEach(() => {
    if (circuitBreaker) {
      circuitBreaker.cleanup();
    }
    ConnectionCircuitBreaker.cleanupAll();
    NetworkStateManager.resetInstance();
  });

  describe('Network-Aware Circuit Breaking', () => {
    it('should adjust failure threshold based on network type', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Wi-Fi should have lower failure threshold
      const wifiRecommendation = circuitBreaker.getRecommendation();
      expect(wifiRecommendation.networkInfo.type).toBe('wifi');
      expect(wifiRecommendation.networkInfo.adaptive).toBe(true);

      // Test multiple failures up to Wi-Fi threshold
      for (let i = 0; i < 4; i++) {
        circuitBreaker.onFailure(`Test failure ${i + 1}`);
      }

      // Should still be closed (Wi-Fi threshold is 4)
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // One more failure should open the circuit
      circuitBreaker.onFailure('Final failure');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should have higher tolerance for cellular networks', async () => {
      ConnectionCircuitBreaker.cleanupAll();
      NetworkStateManager.resetInstance();

      // Setup cellular network
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '4g' }
      });

      const cellularCircuitBreaker = ConnectionCircuitBreaker.getInstance('cellular-test');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Cellular should tolerate more failures (threshold is 8)
      for (let i = 0; i < 7; i++) {
        cellularCircuitBreaker.onFailure(`Cellular failure ${i + 1}`);
      }

      expect(cellularCircuitBreaker.getState()).toBe(CircuitState.CLOSED);

      cellularCircuitBreaker.cleanup();
    });

    it('should adjust thresholds based on connection quality', async () => {
      // Simulate poor connection quality
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      );

      await new Promise(resolve => setTimeout(resolve, 300));

      const networkManager = NetworkStateManager.getInstance();
      await networkManager.forceQualityReassessment();

      // Poor quality should increase failure tolerance
      const recommendation = circuitBreaker.getRecommendation();
      expect(recommendation.networkInfo.quality).toBeLessThan(50);

      networkManager.cleanup();
    });
  });

  describe('Adaptive Recovery Timing', () => {
    it('should recover faster on high-quality networks', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        circuitBreaker.onFailure(`Failure ${i + 1}`);
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wi-Fi with good quality should have faster recovery
      const recommendation = circuitBreaker.getRecommendation();
      expect(recommendation.networkInfo.type).toBe('wifi');
      expect(recommendation.connectionStrategy).toBe(ConnectionStrategy.POLLING_ONLY);
    });

    it('should use exponential backoff for recovery attempts', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force circuit to open and test multiple recovery attempts
      for (let i = 0; i < 5; i++) {
        circuitBreaker.onFailure(`Initial failure ${i + 1}`);
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Move to half-open and fail again (should increase timeout)
      circuitBreaker.onFailure('Recovery failure');

      const stats = circuitBreaker.getStats();
      expect(stats.consecutiveFailures).toBeGreaterThan(5);
    });
  });

  describe('Connection Strategy Recommendations', () => {
    it('should recommend appropriate strategies based on circuit state', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Healthy circuit should recommend based on network quality
      let recommendation = circuitBreaker.getRecommendation();
      expect(recommendation.shouldExecute).toBe(true);
      expect(recommendation.connectionStrategy).toBe(ConnectionStrategy.AGGRESSIVE_WEBSOCKET);

      // Open circuit should recommend polling only
      for (let i = 0; i < 5; i++) {
        circuitBreaker.onFailure(`Failure ${i + 1}`);
      }

      recommendation = circuitBreaker.getRecommendation();
      expect(recommendation.shouldExecute).toBe(false);
      expect(recommendation.connectionStrategy).toBe(ConnectionStrategy.POLLING_ONLY);
      expect(recommendation.fallbackSuggested).toBe(true);
    });

    it('should provide detailed network information in recommendations', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const recommendation = circuitBreaker.getRecommendation();
      
      expect(recommendation.networkInfo).toMatchObject({
        type: expect.stringMatching(/wifi|cellular|ethernet|unknown/),
        quality: expect.any(Number),
        adaptive: true,
      });

      expect(recommendation.reason).toContain('Circuit is');
    });
  });

  describe('Network State Change Handling', () => {
    it('should reset circuit when network quality significantly improves', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        circuitBreaker.onFailure(`Failure ${i + 1}`);
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Simulate significant network quality improvement
      const networkManager = NetworkStateManager.getInstance();
      const mockListener = NetInfo.addEventListener.mock.calls[0][0];
      
      // Mock excellent network conditions
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      mockListener({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
        details: { strength: 100, ssid: 'FastWiFi' }
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Circuit should have been reset due to network improvement
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      networkManager.cleanup();
    });

    it('should track network type changes', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate network type change
      const mockListener = NetInfo.addEventListener.mock.calls[0][0];
      mockListener({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '5g' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = circuitBreaker.getStats();
      expect(stats.networkType).toBe('cellular');
      expect(stats.lastNetworkChange).toBeGreaterThan(0);
    });
  });

  describe('Connection Quality Assessment', () => {
    it('should provide connection quality information', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const quality = circuitBreaker.getConnectionQuality();
      
      expect(quality).toMatchObject({
        score: expect.any(Number),
        level: expect.stringMatching(/excellent|good|fair|poor|offline/),
        networkType: expect.any(String),
        recommendation: expect.any(String),
      });

      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(quality.score).toBeLessThanOrEqual(100);
    });

    it('should update quality assessment over time', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const initialQuality = circuitBreaker.getConnectionQuality();
      
      // Simulate network degradation
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Slow network')), 2000))
      );

      const networkManager = NetworkStateManager.getInstance();
      await networkManager.forceQualityReassessment();

      const updatedQuality = circuitBreaker.getConnectionQuality();
      expect(updatedQuality.score).toBeLessThan(initialQuality.score);

      networkManager.cleanup();
    });
  });

  describe('Resource Management', () => {
    it('should cleanup network listeners properly', () => {
      const initialListenerCount = NetInfo.addEventListener.mock.calls.length;
      
      const breaker1 = ConnectionCircuitBreaker.getInstance('service-1');
      const breaker2 = ConnectionCircuitBreaker.getInstance('service-2');
      
      expect(NetInfo.addEventListener.mock.calls.length).toBeGreaterThan(initialListenerCount);
      
      breaker1.cleanup();
      breaker2.cleanup();
      
      // Network manager should still have its listener
      const networkManager = NetworkStateManager.getInstance();
      networkManager.cleanup();
    });

    it('should handle multiple circuit breaker instances', () => {
      const service1 = ConnectionCircuitBreaker.getInstance('service-1');
      const service2 = ConnectionCircuitBreaker.getInstance('service-2');
      const service1Again = ConnectionCircuitBreaker.getInstance('service-1');

      expect(service1).toBe(service1Again);
      expect(service1).not.toBe(service2);

      service1.cleanup();
      service2.cleanup();
    });
  });
});