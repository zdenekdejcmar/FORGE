import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../lib/api';

export default function ArenasPage() {
  const { token } = useAuth();
  const arenasQuery = useQuery({ queryKey: ['arenas'], queryFn: () => api.getArenas(token!), enabled: !!token });

  const arenas = arenasQuery.data ?? [];

  return (
    <div className="page-shell">
      <div className="panel">
        <h1>Arenas</h1>
        {arenas.length === 0 ? <p className="empty-state">Choose where your effort compounds.</p> : (
          <div className="arena-grid">
            {arenas.map((arena) => (
              <div key={arena.id} className="panel arena-card">
                <p className="eyebrow">ARENA</p>
                <h3>{arena.name}</h3>
                <div className="progress-bar"><span style={{ width: `${arena.progressPercent ?? 0}%` }} /></div>
                <div className="label-row"><span>{arena.totalXp ?? 0} XP</span><span>Lv {arena.level ?? 1}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
