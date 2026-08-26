import { describe, expect, it, vi } from 'vitest';
import questRoutes from './routes';

describe('quest routes', () => {
  it('registers the protected completion endpoint', async () => {
    const calls: string[] = [];
    const app: any = {
      authenticate: vi.fn(),
      post: (...args: any[]) => {
        calls.push(args[0]);
      },
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      db: {},
    };

    await questRoutes(app, {} as any);

    expect(calls).toContain('/');
    expect(calls).toContain('/:id/complete');
  });
});
