import { describe, expect, it, vi } from 'vitest';
import dailyRoutes from './routes';

describe('daily routes', () => {
  it('registers the checkin endpoint', async () => {
    const calls: string[] = [];
    const app: any = {
      authenticate: vi.fn(),
      post: (...args: any[]) => { calls.push(args[0]); },
      get: (...args: any[]) => { calls.push(args[0]); },
      db: {},
    };

    await dailyRoutes(app, {} as any);

    expect(calls).toContain('/checkin');
  });
});
