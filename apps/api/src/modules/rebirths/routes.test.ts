import { describe, expect, it, vi } from 'vitest';
import rebirthRoutes from './routes';

describe('rebirth routes', () => {
  it('registers the rebirth endpoint', async () => {
    const calls: string[] = [];
    const app: any = {
      authenticate: vi.fn(),
      post: (...args: any[]) => { calls.push(args[0]); },
      get: (...args: any[]) => { calls.push(args[0]); },
      db: {},
    };

    await rebirthRoutes(app, {} as any);

    expect(calls).toContain('/');
  });
});
