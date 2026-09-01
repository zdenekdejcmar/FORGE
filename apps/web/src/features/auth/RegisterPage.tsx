import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.register({ email, password });
      login(response.token, response.user);
      try {
        // Auto-create is enabled for E2E when the initial load had
        // `autoCreateCharacter=1`. We persist that intent in localStorage
        // so navigation to /register doesn't lose it.
        const auto = typeof window !== 'undefined' && (window.location.search.includes('autoCreateCharacter=1') || localStorage.getItem('autoCreateCharacter') === '1');
        if (auto) {
          // clear flag to avoid affecting other flows
            try { localStorage.removeItem('autoCreateCharacter'); } catch (err) {
              // ignore localStorage errors in test env
            }
          await api.createCharacter(response.token, { name: response.user.email.split('@')[0], title: 'New Forge', archetype: '', lore: '', avatarUrl: '' });
          navigate('/');
        } else {
          navigate('/onboarding');
        }
      } catch (e) {
        // if auto-creating fails, fall back to onboarding
          try { localStorage.removeItem('autoCreateCharacter'); } catch (err) {
            // ignore localStorage errors in test env
          }
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">CREATE ACCOUNT</p>
        <h1>Register</h1>
        <form onSubmit={onSubmit}>
          <label>
            Email
            <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="subtle">
          Already a member? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
