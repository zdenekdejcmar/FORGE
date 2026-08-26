import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../lib/api';

export default function JournalPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [built, setBuilt] = useState('');
  const [burned, setBurned] = useState('');
  const [protect, setProtect] = useState('');
  const date = new Date().toISOString().slice(0, 10);

  const journalQuery = useQuery({ queryKey: ['journal'], queryFn: () => api.getJournal(token!), enabled: !!token });
  const saveEntry = useMutation({
    mutationFn: () => api.upsertJournal(token!, date, { built, burned, protect }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  });

  const entries = journalQuery.data ?? [];

  return (
    <div className="page-shell">
      <div className="panel">
        <h1>Journal</h1>
        <div className="stack">
          <label>BUILD<textarea value={built} onChange={(e) => setBuilt(e.target.value)} /></label>
          <label>BURN<textarea value={burned} onChange={(e) => setBurned(e.target.value)} /></label>
          <label>PROTECT<textarea value={protect} onChange={(e) => setProtect(e.target.value)} /></label>
          <button onClick={() => saveEntry.mutate()} disabled={saveEntry.isPending}>Save</button>
        </div>

        <div className="journal-list">
          {entries.map((entry) => (
            <div key={entry.id} className="panel mini-card">
              <strong>{entry.entryDate}</strong>
              <p>{entry.built || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
