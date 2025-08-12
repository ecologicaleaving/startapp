import { useState, useEffect } from 'react';
import { NetworkMonitor } from '../services/NetworkMonitor';

/**
 * Hook for network connectivity status
 * Provides real-time network status updates
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const networkMonitor = NetworkMonitor.getInstance();
    
    // Set initial state
    setIsConnected(networkMonitor.isConnected);
    setIsInitialized(true);

    // Subscribe to network changes
    const unsubscribe = networkMonitor.addListener((connected: boolean) => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return {
    isConnected,
    isOffline: !isConnected,
    isInitialized
  };
}