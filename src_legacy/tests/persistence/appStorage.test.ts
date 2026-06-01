import { describe, expect, it } from 'vitest';

import { appStorage } from '@/persistence/appStorage';

describe('appStorage', () => {
  it('provides a storage adapter in the test environment', async () => {
    await appStorage.setItem('test-key', 'value');
    await expect(appStorage.getItem('test-key')).resolves.toBe('value');
    await appStorage.removeItem('test-key');
    await expect(appStorage.getItem('test-key')).resolves.toBeNull();
  });
});
