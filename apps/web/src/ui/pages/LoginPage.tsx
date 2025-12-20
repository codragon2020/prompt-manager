import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../../api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin1234');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password],
  );

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>

      <div style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <div>Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <div>Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

        <button
          disabled={!canSubmit || submitting}
          onClick={async () => {
            setError(null);
            setSubmitting(true);
            try {
              const { token } = await api.login({ email, password });
              setToken(token);
              navigate('/prompts');
            } catch (e: any) {
              const message = e?.error?.message || 'Login failed';
              setError(message);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
