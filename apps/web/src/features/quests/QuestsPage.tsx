import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../lib/api';

export default function QuestsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [arenaId, setArenaId] = useState('');
  const [type, setType] = useState('MAIN');
  const [difficulty, setDifficulty] = useState('HARD');
  const [xpReward, setXpReward] = useState(50);

  const arenasQuery = useQuery({ queryKey: ['arenas'], queryFn: () => api.getArenas(token!), enabled: !!token });
  const questsQuery = useQuery({ queryKey: ['quests'], queryFn: () => api.getQuests(token!), enabled: !!token });

  const createQuest = useMutation({
    mutationFn: () => api.createQuest(token!, { title, arenaId, type, difficulty, xpReward, status: 'ACTIVE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quests'] });
      setShowForm(false);
      setTitle('');
    },
  });

  const completeQuest = useMutation({
    mutationFn: (questId: string) => api.completeQuest(token!, questId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quests'] }),
  });

  const quests = questsQuery.data ?? [];
  const arenas = arenasQuery.data ?? [];

  return (
    <div className="page-shell">
      <div className="panel">
        <div className="section-header"><h1>Quest Log</h1><button onClick={() => setShowForm((v) => !v)}>New Quest</button></div>
        {showForm && (
          <div className="stack form-box">
            <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label>Arena<select value={arenaId} onChange={(e) => setArenaId(e.target.value)}>
              {arenas.map((arena) => <option key={arena.id} value={arena.id}>{arena.name}</option>)}
            </select></label>
            <label>Type<select value={type} onChange={(e) => setType(e.target.value)}>
              {['MAIN','DAILY','WEEKLY','SIDE','BOSS','MAINTENANCE','RECOVERY','EXPLORATION'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select></label>
            <label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {['TRIVIAL','EASY','NORMAL','HARD','EPIC','BOSS'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select></label>
            <label>XP Reward<input type="number" value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))} /></label>
            <button onClick={() => createQuest.mutate()} disabled={!title || !arenaId}>Save Quest</button>
          </div>
        )}

        <div className="quest-list">
          {quests.length === 0 ? <p className="empty-state">Your quest log is empty. Create the next thing worth fighting for.</p> : quests.map((quest) => (
            <div key={quest.id} className="quest-row">
              <div>
                <h3>{quest.title}</h3>
                <p>{quest.status} • {quest.type} • {quest.difficulty} • {quest.xpReward} XP</p>
              </div>
              <button onClick={() => completeQuest.mutate(quest.id)} disabled={quest.status === 'COMPLETED'}>{quest.status === 'COMPLETED' ? 'Completed' : 'Complete'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
