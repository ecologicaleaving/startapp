import { useState, useEffect } from 'react';
import { CacheResult } from '../types/cache';

export interface DataFreshnessInfo {
  age: number; // in milliseconds
  relativeTime: string;
  freshnessLevel: 'fresh' | 'moderate' | 'stale';
  isExpired: boolean;
  lastUpdated: Date;
}

/**
 * Hook for managing data freshness information
 * Provides real-time updates of data age and freshness level
 */
export function useDataFreshness(
  cacheResult?: CacheResult<any>,
  maxAge?: number,
  updateInterval: number = 30000 // Update every 30 seconds
): DataFreshnessInfo | null {
  const [freshnessInfo, setFreshnessInfo] = useState<DataFreshnessInfo | null>(null);

  useEffect(() => {
    if (!cacheResult?.timestamp) {
      setFreshnessInfo(null);
      return;
    }

    const calculateFreshness = (): DataFreshnessInfo => {
      const now = Date.now();
      const age = now - cacheResult.timestamp;
      const lastUpdated = new Date(cacheResult.timestamp);

      // Calculate relative time string
      const getRelativeTime = () => {
        const seconds = Math.floor(age / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return `${seconds}s ago`;
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
      };

      // Calculate freshness level
      const getFreshnessLevel = (): 'fresh' | 'moderate' | 'stale' => {
        if (maxAge) {
          if (age < maxAge * 0.3) return 'fresh';
          if (age < maxAge * 0.7) return 'moderate';
          return 'stale';
        }

        // Default thresholds based on cache source
        switch (cacheResult.source) {
          case 'memory':
            if (age < 2 * 60 * 1000) return 'fresh'; // < 2 minutes
            if (age < 10 * 60 * 1000) return 'moderate'; // < 10 minutes
            return 'stale';
          
          case 'localStorage':
            if (age < 15 * 60 * 1000) return 'fresh'; // < 15 minutes
            if (age < 60 * 60 * 1000) return 'moderate'; // < 1 hour
            return 'stale';
          
          case 'offline':
            if (age < 60 * 60 * 1000) return 'fresh'; // < 1 hour
            if (age < 24 * 60 * 60 * 1000) return 'moderate'; // < 24 hours
            return 'stale';
          
          case 'supabase':
            if (age < 5 * 60 * 1000) return 'fresh'; // < 5 minutes
            if (age < 30 * 60 * 1000) return 'moderate'; // < 30 minutes
            return 'stale';
          
          case 'api':
            return 'fresh'; // API data is always fresh
          
          default:
            if (age < 5 * 60 * 1000) return 'fresh';
            if (age < 60 * 60 * 1000) return 'moderate';
            return 'stale';
        }
      };

      const freshnessLevel = getFreshnessLevel();
      const isExpired = maxAge ? age > maxAge : false;

      return {
        age,
        relativeTime: getRelativeTime(),
        freshnessLevel,
        isExpired,
        lastUpdated,
      };
    };

    // Calculate initial freshness
    setFreshnessInfo(calculateFreshness());

    // Set up interval to update freshness info
    const interval = setInterval(() => {
      setFreshnessInfo(calculateFreshness());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [cacheResult, maxAge, updateInterval]);

  return freshnessInfo;
}

/**
 * Simple hook to get freshness level without real-time updates
 */
export function getDataFreshnessLevel(
  timestamp: number,
  source: string = 'unknown',
  maxAge?: number
): 'fresh' | 'moderate' | 'stale' {
  const now = Date.now();
  const age = now - timestamp;

  if (maxAge) {
    if (age < maxAge * 0.3) return 'fresh';
    if (age < maxAge * 0.7) return 'moderate';
    return 'stale';
  }

  // Default thresholds based on source
  switch (source) {
    case 'memory':
      if (age < 2 * 60 * 1000) return 'fresh';
      if (age < 10 * 60 * 1000) return 'moderate';
      return 'stale';
    
    case 'localStorage':
      if (age < 15 * 60 * 1000) return 'fresh';
      if (age < 60 * 60 * 1000) return 'moderate';
      return 'stale';
    
    case 'offline':
      if (age < 60 * 60 * 1000) return 'fresh';
      if (age < 24 * 60 * 60 * 1000) return 'moderate';
      return 'stale';
    
    case 'supabase':
      if (age < 5 * 60 * 1000) return 'fresh';
      if (age < 30 * 60 * 1000) return 'moderate';
      return 'stale';
    
    case 'api':
      return 'fresh';
    
    default:
      if (age < 5 * 60 * 1000) return 'fresh';
      if (age < 60 * 60 * 1000) return 'moderate';
      return 'stale';
  }
}

/**
 * Get human-readable relative time
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const age = now - timestamp;
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}