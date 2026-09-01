import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../lib/api';
import DailyCheckin from './DailyCheckin';
import CreateFairEnemy from './CreateFairEnemy';

export default function DashboardPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const characterQuery = useQuery({
    queryKey: ['character'],
    queryFn: () => api.getCharacter(token!),
    enabled: !!token,
  });

  const progressQuery = useQuery({
    queryKey: ['progress-character'],
    queryFn: () => api.getProgressCharacter(token!),
    enabled: !!token,
  });

  const arenasQuery = useQuery({
    queryKey: ['arenas'],
    queryFn: () => api.getArenas(token!),
    enabled: !!token,
  });

  const questsQuery = useQuery({
    queryKey: ['quests'],
    queryFn: () => api.getQuests(token!),
    enabled: !!token,
  });

  const completeQuest = useMutation({
    mutationFn: (questId: string) => api.completeQuest(token!, questId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quests'] });
      qc.invalidateQueries({ queryKey: ['character'] });
      qc.invalidateQueries({ queryKey: ['progress-character'] });
      qc.invalidateQueries({ queryKey: ['arenas'] });
    },
  });

  const character = characterQuery.data;
  const progress = progressQuery.data;
  const arenas = arenasQuery.data ?? [];
  const quests = questsQuery.data ?? [];
  const rebirthQuery = useQuery({ queryKey: ['rebirth-current'], queryFn: () => api.getCurrentRebirth(token!), enabled: !!token });
  const todayCheckin = useQuery({ queryKey: ['daily-today'], queryFn: () => api.getTodayCheckin(token!), enabled: !!token });
  const fairEnemyQuery = useQuery({ queryKey: ['fair-today'], queryFn: () => api.getFairEnemyToday(token!), enabled: !!token });
  const attributesQuery = useQuery({ queryKey: ['attributes'], queryFn: () => api.getAttributes(token!), enabled: !!token });

  const activeQuests = useMemo(() => quests.filter((quest) => quest.status === 'ACTIVE'), [quests]);

  if (characterQuery.isLoading || progressQuery.isLoading) return <div className="page-shell"><div className="panel">Loading...</div></div>;
  if (!character) return <div className="page-shell"><div className="panel">No character found. <Link to="/onboarding">Create one</Link>.</div></div>;

  return (
    <div className="page-shell dashboard">
      <aside className="sidebar">
        <div className="brand-box">
          <p className="eyebrow">FORGE</p>
          <h2>{character.name}</h2>
          <p>{character.title || 'The Unnamed'}</p>
        </div>
        <div className="stat-box">
          <span>Level</span>
          <strong>{progress?.level ?? 1}</strong>
        </div>
        <div className="stat-box">
          <span>Total XP</span>
          <strong>{progress?.totalXp ?? 0}</strong>
        </div>
      </aside>

      <main className="main-panel">
        <div className="topbar">
          <div>
            <p className="eyebrow">CHARACTER SHEET</p>
            <h1>{character.name}</h1>
          </div>
          <div className="toolbar">
            <Link to="/quests">Quest Log</Link>
            <Link to="/arenas">Arenas</Link>
            <Link to="/journal">Journal</Link>
          </div>
        </div>

        <div className="xp-panel panel">
          <div className="label-row"><span>{character.title || 'The Unnamed'}</span><span>Lv {progress?.level ?? 1}</span></div>
          <div className="label-row"><span>Current Rebirth</span><strong>{rebirthQuery.data ? JSON.parse(rebirthQuery.data.metadata ?? '{}').title + ' (' + JSON.parse(rebirthQuery.data.metadata ?? '{}').name + ')' : '—'}</strong></div>
          <div className="progress-bar"><span style={{ width: `${progress?.progressPercent ?? 0}%` }} /></div>
          <div className="label-row"><span>{progress?.totalXp ?? 0} XP</span><span>{progress?.xpRemaining ?? 0} to next</span></div>
        </div>

        <section className="panel">
          <div className="section-header"><h3>Momentum</h3></div>
          <p>Momentum: {todayCheckin.data?.momentum ?? 0}</p>
          <DailyCheckin />
        </section>

        <section className="panel">
          <div className="section-header"><h3>Today's Fair Enemy</h3></div>
          {fairEnemyQuery.data ? (
            <div>
              <h4>{fairEnemyQuery.data.name}</h4>
              <p>{fairEnemyQuery.data.difficulty} • {fairEnemyQuery.data.primaryAttribute} • {fairEnemyQuery.data.xpReward} XP</p>
              <p>Status: {fairEnemyQuery.data.status}</p>
              {fairEnemyQuery.data.status === 'ACTIVE' && <button onClick={async () => { await api.defeatFairEnemy(token!, fairEnemyQuery.data.id); qc.invalidateQueries({ queryKey: ['fair-today'] }); qc.invalidateQueries({ queryKey: ['progress-character'] }); qc.invalidateQueries({ queryKey: ['attributes'] }); }}>Defeat</button>}
            </div>
          ) : (
            <div>
              <p>No Fair Enemy for today.</p>
              <CreateFairEnemy attributes={attributesQuery.data ?? []} onCreated={() => { qc.invalidateQueries({ queryKey: ['fair-today'] }); qc.invalidateQueries({ queryKey: ['progress-character'] }); }} token={token!} />
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-header"><h3>Core Attributes</h3></div>
          <div className="attributes-grid">
            {attributesQuery.data?.map((a) => (
              <div key={a.id} className="attribute-card">
                <strong>{a.name}</strong>
                <div className="progress-bar small"><span style={{ width: `${Math.min(100, (a.value % 100))}%` }} /></div>
                <div className="label-row"><span>{a.value} XP</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="arena-grid">
          {arenas.map((arena) => (
            <div key={arena.id} className="panel arena-card">
              <div className="label-row"><strong>{arena.name}</strong><span>Lvl {arena.level ?? 1}</span></div>
              <div className="progress-bar"><span style={{ width: `${arena.progressPercent ?? 0}%` }} /></div>
              <div className="label-row"><span>{arena.totalXp ?? 0} XP</span><span>{arena.progressPercent ?? 0}%</span></div>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="section-header"><h3>Active Quests</h3><Link to="/quests">Open log</Link></div>
          {activeQuests.length === 0 ? <p className="empty-state">Your quest log is empty. Create the next thing worth fighting for.</p> : activeQuests.slice(0,4).map((quest) => (
            <div key={quest.id} className="quest-row">
              <div>
                <h4>{quest.title}</h4>
                <p>{quest.type} • {quest.difficulty} • {quest.xpReward} XP</p>
              </div>
              <button onClick={() => completeQuest.mutate(quest.id)} disabled={completeQuest.isPending}>Complete</button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
