import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../lib/api';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState({ name: '', title: '', archetype: '', lore: '', avatarUrl: '' });
  const [arenaName, setArenaName] = useState('Developer');
  const [questTitle, setQuestTitle] = useState('Ship the first FORGE vertical slice');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createCharacter = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await api.createCharacter(token, character);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Character creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const createArenaAndQuest = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const arena = await api.createArena(token, { name: arenaName, slug: arenaName.toLowerCase(), description: 'Core production arena.' });
      if (!arena?.id) {
        throw new Error('Arena creation failed.');
      }

      await api.createQuest(token, {
        title: questTitle,
        description: 'Ship the first FORGE vertical slice.',
        arenaId: arena.id,
        type: 'MAIN',
        difficulty: 'HARD',
        xpReward: 50,
        status: 'ACTIVE',
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="panel">
        <p className="eyebrow">INITIALIZE</p>
        <h1>Forge your first identity</h1>
        {error && <div className="alert error">{error}</div>}

        {step === 1 && (
          <div className="stack">
            <label>Name<input value={character.name} onChange={(e) => setCharacter({ ...character, name: e.target.value })} /></label>
            <label>Title<input value={character.title} onChange={(e) => setCharacter({ ...character, title: e.target.value })} /></label>
            <label>Archetype<input value={character.archetype} onChange={(e) => setCharacter({ ...character, archetype: e.target.value })} /></label>
            <label>Lore<textarea value={character.lore} onChange={(e) => setCharacter({ ...character, lore: e.target.value })} /></label>
            <button onClick={createCharacter} disabled={loading || !character.name}>{loading ? 'Creating...' : 'Create Character'}</button>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <label>Primary Arena<input value={arenaName} onChange={(e) => setArenaName(e.target.value)} /></label>
            <label>First Quest<input value={questTitle} onChange={(e) => setQuestTitle(e.target.value)} /></label>
            <button onClick={createArenaAndQuest} disabled={loading || !questTitle}>{loading ? 'Creating...' : 'Create First Quest'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
