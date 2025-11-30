import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Provide a lightweight fetch mock so data hooks resolve in unit tests without a network.
if (!(globalThis.fetch as any)) {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ([]),
    text: async () => '',
  })) as any;
}
