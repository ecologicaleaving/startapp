/**
 * Assignment Status Service Tests
 * Tests for centralized status state management and real-time propagation
 */

import AssignmentStatusManager, { AssignmentStatus, StatusUpdateEvent } from '../../services/AssignmentStatusService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('AssignmentStatusManager', () => {
  let statusManager: AssignmentStatusManager;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get fresh instance for each test
    statusManager = AssignmentStatusManager.getInstance();
    statusManager.clearAllStatuses();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AssignmentStatusManager.getInstance();
      const instance2 = AssignmentStatusManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Status Management', () => {
    it('should update assignment status successfully', async () => {
      const assignmentId = 'test-assignment-1';
      const newStatus: AssignmentStatus = 'current';

      await statusManager.updateStatus(assignmentId, newStatus, 'normal');

      const retrievedStatus = statusManager.getStatus(assignmentId);
      expect(retrievedStatus).toBeDefined();
      expect(retrievedStatus?.status).toBe(newStatus);
      expect(retrievedStatus?.urgency).toBe('normal');
      expect(retrievedStatus?.assignmentId).toBe(assignmentId);
    });

    it('should persist status updates to AsyncStorage', async () => {
      const assignmentId = 'test-assignment-1';
      const newStatus: AssignmentStatus = 'upcoming';

      await statusManager.updateStatus(assignmentId, newStatus);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'assignment_status_states',
        expect.stringContaining(assignmentId)
      );
    });

    it('should calculate urgency based on match time', () => {
      const now = new Date();
      
      // 3 minutes from now - critical
      const criticalTime = new Date(now.getTime() + 3 * 60 * 1000).toISOString();
      expect(statusManager.calculateUrgency(criticalTime)).toBe('critical');
      
      // 10 minutes from now - warning
      const warningTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      expect(statusManager.calculateUrgency(warningTime)).toBe('warning');
      
      // 30 minutes from now - normal
      const normalTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
      expect(statusManager.calculateUrgency(normalTime)).toBe('normal');
    });

    it('should emit status update events', async () => {
      const assignmentId = 'test-assignment-1';
      const newStatus: AssignmentStatus = 'current';
      let receivedEvent: StatusUpdateEvent | null = null;

      const unsubscribe = statusManager.subscribeToUpdates((event) => {
        receivedEvent = event;
      });

      await statusManager.updateStatus(assignmentId, newStatus);

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent?.type).toBe('status_change');
      expect(receivedEvent?.assignmentId).toBe(assignmentId);
      expect(receivedEvent?.newStatus).toBe(newStatus);
      expect(receivedEvent?.timestamp).toBeDefined();

      unsubscribe();
    });
  });

  describe('Status Retrieval', () => {
    beforeEach(async () => {
      // Setup test data
      await statusManager.updateStatus('assignment-1', 'current');
      await statusManager.updateStatus('assignment-2', 'upcoming');
      await statusManager.updateStatus('assignment-3', 'completed');
      await statusManager.updateStatus('assignment-4', 'current');
    });

    it('should retrieve all statuses', () => {
      const allStatuses = statusManager.getAllStatuses();
      expect(allStatuses).toHaveLength(4);
    });

    it('should filter assignments by status', () => {
      const currentAssignments = statusManager.getAssignmentsByStatus('current');
      expect(currentAssignments).toHaveLength(2);
      expect(currentAssignments.every(a => a.status === 'current')).toBe(true);

      const upcomingAssignments = statusManager.getAssignmentsByStatus('upcoming');
      expect(upcomingAssignments).toHaveLength(1);
      expect(upcomingAssignments[0].status).toBe('upcoming');
    });

    it('should return undefined for non-existent assignment', () => {
      const nonExistentStatus = statusManager.getStatus('non-existent-id');
      expect(nonExistentStatus).toBeUndefined();
    });
  });

  describe('Network Status Management', () => {
    it('should handle offline status changes', async () => {
      const assignmentId = 'test-assignment-1';
      
      // Go offline
      statusManager.setNetworkStatus(false);
      
      await statusManager.updateStatus(assignmentId, 'current');
      
      const status = statusManager.getStatus(assignmentId);
      expect(status?.syncStatus).toBe('pending');
    });

    it('should sync when coming back online', async () => {
      const assignmentId = 'test-assignment-1';
      let syncCompletedEventReceived = false;

      statusManager.on('syncCompleted', () => {
        syncCompletedEventReceived = true;
      });

      // Go offline and make changes
      statusManager.setNetworkStatus(false);
      await statusManager.updateStatus(assignmentId, 'current');
      
      // Come back online - this should trigger sync
      statusManager.setNetworkStatus(true);
      
      const status = statusManager.getStatus(assignmentId);
      expect(status?.syncStatus).toBe('synced');
    }, 10000);

    it('should emit network status change events', () => {
      let receivedNetworkEvent: { isOnline: boolean } | null = null;

      const unsubscribe = statusManager.subscribeToNetworkChanges((event) => {
        receivedNetworkEvent = event;
      });

      statusManager.setNetworkStatus(false);

      expect(receivedNetworkEvent).toBeDefined();
      expect(receivedNetworkEvent?.isOnline).toBe(false);

      unsubscribe();
    });
  });

  describe('Data Persistence', () => {
    it('should clear all statuses', async () => {
      // Add some test data
      await statusManager.updateStatus('assignment-1', 'current');
      await statusManager.updateStatus('assignment-2', 'upcoming');

      expect(statusManager.getAllStatuses()).toHaveLength(2);

      await statusManager.clearAllStatuses();

      expect(statusManager.getAllStatuses()).toHaveLength(0);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('assignment_status_states');
    });

    it('should handle storage initialization errors gracefully', () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw error during construction
      expect(() => {
        AssignmentStatusManager.getInstance();
      }).not.toThrow();
    });
  });

  describe('Real-time Updates Performance', () => {
    it('should propagate status updates within 2 seconds', async () => {
      const assignmentId = 'test-assignment-1';
      const startTime = Date.now();
      let updateReceived = false;

      const unsubscribe = statusManager.subscribeToUpdates(() => {
        updateReceived = true;
        const endTime = Date.now();
        const propagationTime = endTime - startTime;
        
        // Should be much faster than 2 seconds (testing local propagation)
        expect(propagationTime).toBeLessThan(100); 
      });

      await statusManager.updateStatus(assignmentId, 'current');

      expect(updateReceived).toBe(true);
      unsubscribe();
    });

    it('should handle multiple rapid status updates', async () => {
      const assignmentId = 'test-assignment-1';
      const updatePromises: Promise<void>[] = [];

      // Rapid fire 5 status updates
      for (let i = 0; i < 5; i++) {
        const status: AssignmentStatus = i % 2 === 0 ? 'current' : 'upcoming';
        updatePromises.push(statusManager.updateStatus(assignmentId, status));
      }

      await Promise.all(updatePromises);

      const finalStatus = statusManager.getStatus(assignmentId);
      expect(finalStatus).toBeDefined();
      expect(['current', 'upcoming']).toContain(finalStatus?.status);
    });
  });
});