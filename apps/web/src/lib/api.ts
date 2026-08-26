const API_BASE = 'http://localhost:3001';

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> ?? {}) };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let payload: any = {};
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: { message: text || 'Request failed.' } };
    }
    throw new Error(payload?.error?.message ?? 'Request failed.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type User = { id: string; email: string };
type Character = { id: string; name: string; title?: string | null; archetype?: string | null; avatarUrl?: string | null; lore?: string | null; userId?: string; createdAt?: string; updatedAt?: string };
type Arena = { id: string; name: string; slug: string; description?: string | null; userId?: string; createdAt?: string; updatedAt?: string; deletedAt?: string | null };
type Quest = { id: string; title: string; description?: string | null; arenaId: string; type: string; difficulty: string; xpReward: number; status?: string; dueAt?: string | null };
type CharacterProgress = { level: number; totalXp: number; xpIntoLevel: number; xpRemaining: number; progressPercent: number };
type ArenaProgress = Arena & CharacterProgress;

export const api = {
  register: (payload: { email: string; password: string }) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: (token: string) => request<{ user: User }>('/auth/me', { method: 'GET' }, token),
  createCharacter: (token: string, payload: any) => request<Character>('/character', { method: 'POST', body: JSON.stringify(payload) }, token),
  getCharacter: (token: string) => request<Character>('/character', { method: 'GET' }, token),
  createArena: (token: string, payload: any) => request<Arena>('/arenas', { method: 'POST', body: JSON.stringify(payload) }, token),
  getArenas: (token: string) => request<ArenaProgress[]>('/arenas', { method: 'GET' }, token),
  createQuest: (token: string, payload: any) => request<Quest>('/quests', { method: 'POST', body: JSON.stringify(payload) }, token),
  getQuests: (token: string) => request<Quest[]>('/quests', { method: 'GET' }, token),
  completeQuest: (token: string, questId: string) => request<any>(`/quests/${questId}/complete`, { method: 'POST' }, token),
  getProgressCharacter: (token: string) => request<CharacterProgress>('/progress/character', { method: 'GET' }, token),
  getProgressArenas: (token: string) => request<ArenaProgress[]>('/progress/arenas', { method: 'GET' }, token),
  getJournal: (token: string) => request<any[]>('/journal', { method: 'GET' }, token),
  upsertJournal: (token: string, date: string, payload: any) => request(`/journal/${date}`, { method: 'PUT', body: JSON.stringify(payload) }, token),
};
