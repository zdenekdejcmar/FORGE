import React, { useState } from 'react';
import { api } from '../../lib/api';

export default function CreateFairEnemy({ attributes, onCreated, token }: { attributes: any[]; onCreated: () => void; token: string }) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<'NORMAL'|'HARD'|'EPIC'>('NORMAL');
  const [primary, setPrimary] = useState<string>(attributes[0]?.name ?? 'DISCIPLINE');
  const [xp, setXp] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.createFairEnemy(token, { name, difficulty, primaryAttribute: primary, xpReward: xp });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-fair">
      <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
      <select value={difficulty} onChange={(e)=>setDifficulty(e.target.value as any)}>
        <option value="NORMAL">NORMAL</option>
        <option value="HARD">HARD</option>
        <option value="EPIC">EPIC</option>
      </select>
      <select value={primary} onChange={(e)=>setPrimary(e.target.value)}>
        {attributes.map((a)=> <option key={a.id} value={a.name}>{a.name}</option>)}
      </select>
      <input type="number" value={xp} onChange={(e)=>setXp(Number(e.target.value))} />
      <button onClick={submit} disabled={loading || !name}>Create</button>
    </div>
  );
}
