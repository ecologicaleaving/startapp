import { testSupabaseConnection } from '../supabase';

// Mock environment variables for testing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({
          error: { code: 'PGRST116', message: 'relation "public._healthcheck" does not exist' }
        }))
      }))
    }))
  }))
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Supabase Service', () => {
  describe('testSupabaseConnection', () => {
    it('should return true when table does not exist (expected behavior)', async () => {
      const result = await testSupabaseConnection();
      expect(result).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      // Override mock for this test
      const mockCreateClient = require('@supabase/supabase-js').createClient;
      mockCreateClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              error: { code: 'CONNECTION_ERROR', message: 'Connection failed' }
            }))
          }))
        }))
      });

      const result = await testSupabaseConnection();
      expect(result).toBe(false);
    });
  });
});