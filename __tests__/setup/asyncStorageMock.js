// Comprehensive AsyncStorage mock for tests
const createAsyncStorageMock = () => {
  const storage = {};
  
  return {
    getItem: jest.fn((key) => {
      return Promise.resolve(storage[key] || null);
    }),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => {
      return Promise.resolve(Object.keys(storage));
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys) => {
      return Promise.resolve(keys.map(key => [key, storage[key] || null]));
    }),
    multiSet: jest.fn((keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
    // Expose storage for testing
    __STORAGE__: storage,
    __CLEAR_STORAGE__: () => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }
  };
};

module.exports = { createAsyncStorageMock };