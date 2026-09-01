import { describe, expect, it, vi } from 'vitest';
import attributeRoutes from './routes';

describe('attribute routes', () => {
  it('registers list, create and award endpoints', async () => {
    const calls: string[] = [];
    const app: any = {
      authenticate: vi.fn(),
      get: (...args: any[]) => { calls.push(args[0]); },
      post: (...args: any[]) => { calls.push(args[0]); },
      db: {},
    };

    await attributeRoutes(app, {} as any);

    expect(calls).toContain('/');
    expect(calls).toContain('/:id/award');
  });
});
