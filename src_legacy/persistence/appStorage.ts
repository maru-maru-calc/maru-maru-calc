import AsyncStorage from '@react-native-async-storage/async-storage';

type AppStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

function createMemoryStorage(): AppStorage {
  const values = new Map<string, string>();

  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

export const appStorage: AppStorage =
  typeof window === 'undefined' && process.env.NODE_ENV === 'test' ? createMemoryStorage() : AsyncStorage;
