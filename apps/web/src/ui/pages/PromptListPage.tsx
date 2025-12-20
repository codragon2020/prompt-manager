import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

type PromptListResponse = Awaited<ReturnType<typeof api.listPrompts>>;

export function PromptListPage() {
  const [q, setQ] = useState('');
  const [data, setData] = useState<PromptListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => data?.items || [], [data]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .listPrompts({ q: q.trim() || undefined })
      .then((d) => setData(d))
      .catch((e: any) =>
        setError(e?.error?.message || 'Failed to load prompts'),
      )
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
      >
        <h1 style={{ margin: 0 }}>Prompt Manager</h1>
        <div>
          <Link to="/prompts/new">Create Prompt</Link>
        </div>
      </div>
      <p style={{ color: '#666' }}>Browse prompts (seeded data included).</p>

      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        <input
          placeholder="Search by name/description/content"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd',
          }}
        />
        <div style={{ color: '#666', fontSize: 12 }}>
          {loading ? 'Loading…' : ''}
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 12, color: 'crimson' }}>{error}</div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          border: '1px solid #eee',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#fafafa' }}>
              <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                Name
              </th>
              <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                Owner
              </th>
              <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                Tags
              </th>
              <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  <Link to={`/prompts/${p.id}`}>{p.name}</Link>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                    {p.description || ''}
                  </div>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  {p.ownerTeam || '—'}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  {p.tags.join(', ') || '—'}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  {new Date(p.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 12, color: '#666' }}>
                  No prompts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
