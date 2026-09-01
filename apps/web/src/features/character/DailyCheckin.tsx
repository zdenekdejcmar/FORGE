import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';

const ATTRIBUTES = [
  'SEXUAL_DISCIPLINE',
  'SLEEP',
  'QUALITY_FOOD',
  'HYGIENE',
  'STRENGTH_MOVEMENT',
  'MONEY_DISCIPLINE',
  'CAREER_GROWTH',
  'FREELANCE_BUSINESS',
  'FORGE_BUILDING',
  'ORDER_ENVIRONMENT',
  'CREATIVE_OUTPUT',
  'REFLECTION_SILENCE',
];

const STATES = ['DONE','PARTIAL','MISSED','REST','NOT_APPLICABLE'] as const;

type State = typeof STATES[number];

export default function DailyCheckin() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const attrsQ = useQuery({ queryKey: ['attributes'], queryFn: () => api.getAttributes(token!), enabled: !!token });
  const todayQ = useQuery({ queryKey: ['daily-today'], queryFn: () => api.getTodayCheckin(token!), enabled: !!token });

  const [values, setValues] = useState<Record<string, State>>(() => {
    const s: Record<string, State> = {};
    ATTRIBUTES.forEach((a) => s[a] = 'NOT_APPLICABLE');
    return s;
  });

  useEffect(() => {
    if (todayQ.data?.states) {
      try {
        const parsed = JSON.parse(todayQ.data.states);
        setValues((v) => ({ ...v, ...parsed }));
      } catch (err) {
        // ignore parse errors
      }
    }
  }, [todayQ.data]);

  useEffect(() => {
    if (attrsQ.data && attrsQ.data.length > 0) {
      // ensure keys exist for attributes
      setValues((v) => {
        const copy = { ...v };
        ATTRIBUTES.forEach((a) => { if (!(a in copy)) copy[a] = 'NOT_APPLICABLE'; });
        return copy;
      });
    }
  }, [attrsQ.data]);

  const save = useMutation({
    mutationFn: (payload: any) => api.postDailyCheckin(token!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-today'] });
      qc.invalidateQueries({ queryKey: ['attributes'] });
      qc.invalidateQueries({ queryKey: ['progress-character'] });
    },
  });

  return (
    <div className="panel daily-checkin">
      <div className="section-header"><h3>Daily Check-in</h3></div>
      <p className="muted">Compact check-in. REST / NOT_APPLICABLE do not count as failures.</p>
      <div className="attributes-grid">
        {ATTRIBUTES.map((a) => (
          <div key={a} className={`attribute-row ${a==='SEXUAL_DISCIPLINE' ? 'private' : ''}`}>
            <label>{a === 'SEXUAL_DISCIPLINE' ? 'Private' : a.replace(/_/g,' ')}{a==='SEXUAL_DISCIPLINE' ? ' (private)' : ''}</label>
            <select value={values[a]} onChange={(e) => setValues({ ...values, [a]: e.target.value as State })}>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="actions">
        <button onClick={() => save.mutate({ states: values })} disabled={save.isPending}>Save Check-in</button>
      </div>
      {save.isSuccess && <p className="success">Saved.</p>}
    </div>
  );
}
