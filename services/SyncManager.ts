import { NetworkMonitor } from './NetworkMonitor';
import { CacheService } from './CacheService';
import { FilterOptions } from '../types/cache';

interface SyncTask {
  id: string;
  type: 'tournaments' | 'matches';
  filters?: FilterOptions;
  tournamentNo?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * Sync Manager for automatic data synchronization
 * Handles background sync resume when network connectivity returns
 */
export class SyncManager {
  private static instance: SyncManager | null = null;
  private networkMonitor: NetworkMonitor;
  private syncQueue: SyncTask[] = [];
  private isProcessingQueue = false;
  private syncCallbacks: Set<(taskType: string) => void> = new Set();
  private lastSyncAttempt = 0;
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.networkMonitor = NetworkMonitor.getInstance();
    this.setupNetworkListener();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Setup network connectivity listener for automatic sync resume
   */
  private setupNetworkListener(): void {
    this.networkMonitor.addListener((isConnected: boolean) => {
      if (isConnected) {
        console.log('Network connection restored - resuming sync operations');
        this.processSyncQueue();
      } else {
        console.log('Network connection lost - sync operations paused');
        this.pauseSync();
      }
    });
  }

  /**
   * Add sync task to queue
   */
  addSyncTask(
    type: 'tournaments' | 'matches',
    filters?: FilterOptions,
    tournamentNo?: string,
    maxRetries: number = 3
  ): void {
    const task: SyncTask = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      filters,
      tournamentNo,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.syncQueue.push(task);
    console.log(`Added sync task: ${task.type} (${task.id})`);

    // Try to process immediately if network is available
    if (this.networkMonitor.isConnected) {
      this.processSyncQueue();
    }
  }

  /**
   * Process queued sync tasks when network is available
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.networkMonitor.isConnected) {
      return;
    }

    if (this.syncQueue.length === 0) {
      console.log('Sync queue is empty');
      return;
    }

    this.isProcessingQueue = true;
    const tasksToProcess = [...this.syncQueue];
    this.syncQueue = [];

    console.log(`Processing ${tasksToProcess.length} sync tasks`);

    for (const task of tasksToProcess) {
      try {
        await this.processTask(task);
        console.log(`Successfully synced: ${task.type} (${task.id})`);
        
        // Notify callbacks about successful sync
        this.notifyCallbacks(task.type);
      } catch (error) {
        console.error(`Failed to sync task ${task.id}:`, error);
        
        // Retry logic
        task.retryCount++;
        if (task.retryCount < task.maxRetries) {
          console.log(`Retrying task ${task.id} (attempt ${task.retryCount + 1}/${task.maxRetries})`);
          this.syncQueue.push(task);
        } else {
          console.error(`Task ${task.id} failed after ${task.maxRetries} retries`);
        }
      }
    }

    this.isProcessingQueue = false;
    this.lastSyncAttempt = Date.now();

    // Process any remaining tasks in queue
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processSyncQueue(), 2000); // Wait 2 seconds before retry
    }
  }

  /**
   * Process individual sync task
   */
  private async processTask(task: SyncTask): Promise<void> {
    switch (task.type) {
      case 'tournaments':
        await CacheService.getTournaments(task.filters);
        break;
      
      case 'matches':
        if (!task.tournamentNo) {
          throw new Error('Tournament number required for matches sync');
        }
        await CacheService.getMatches(task.tournamentNo);
        break;
      
      default:
        throw new Error(`Unknown sync task type: ${task.type}`);
    }
  }

  /**
   * Pause sync operations
   */
  private pauseSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Resume sync operations with background interval
   */
  resumeSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Set up periodic sync check (every 5 minutes)
    this.syncInterval = setInterval(() => {
      if (this.networkMonitor.isConnected && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 5 * 60 * 1000);

    // Process queue immediately if network is available
    if (this.networkMonitor.isConnected) {
      this.processSyncQueue();
    }
  }

  /**
   * Add callback for sync completion notifications
   */
  addSyncCallback(callback: (taskType: string) => void): () => void {
    this.syncCallbacks.add(callback);
    
    return () => {
      this.syncCallbacks.delete(callback);
    };
  }

  /**
   * Notify callbacks about sync completion
   */
  private notifyCallbacks(taskType: string): void {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(taskType);
      } catch (error) {
        console.error('Error in sync callback:', error);
      }
    });
  }

  /**
   * Force sync of all cached data (manual refresh)
   */
  async forceSyncAll(filters?: FilterOptions): Promise<{
    tournaments: boolean;
    matches: string[];
  }> {
    if (!this.networkMonitor.isConnected) {
      throw new Error('Cannot force sync while offline');
    }

    const results = {
      tournaments: false,
      matches: [] as string[],
    };

    try {
      // Sync tournaments
      const tournamentsResult = await CacheService.getTournaments(filters);
      results.tournaments = tournamentsResult.source === 'api' || tournamentsResult.source === 'supabase';
      
      // For each tournament, sync matches if they exist in cache
      const cacheStats = await CacheService.getCacheStats();
      // Note: This is a simplified implementation
      // In practice, you'd want to track which tournaments have cached matches
      
      console.log('Force sync completed:', results);
      return results;
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus(): {
    queueLength: number;
    isProcessing: boolean;
    lastSyncAttempt: number;
    networkConnected: boolean;
  } {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessingQueue,
      lastSyncAttempt: this.lastSyncAttempt,
      networkConnected: this.networkMonitor.isConnected,
    };
  }

  /**
   * Clear all pending sync tasks
   */
  clearSyncQueue(): void {
    this.syncQueue = [];
    console.log('Sync queue cleared');
  }

  /**
   * Cleanup and destroy sync manager
   */
  destroy(): void {
    this.pauseSync();
    this.syncQueue = [];
    this.syncCallbacks.clear();
    SyncManager.instance = null;
  }
}