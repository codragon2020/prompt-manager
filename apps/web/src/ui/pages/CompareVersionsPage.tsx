import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { diffLines } from '../lib/diff';

type PromptDetail = Awaited<ReturnType<typeof api.getPrompt>>;

export function CompareVersionsPage() {
  const params = useParams();
  const promptId = params.promptId || '';

  const [data, setData] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');

  useEffect(() => {
    if (!promptId) return;
    setLoading(true);
    setError(null);
    api
      .getPrompt(promptId)
      .then((d) => {
        setData(d);
        const latest = d.versions[0];
        const prev = d.versions[1] || d.versions[0];
        setAId(latest?.id || '');
        setBId(prev?.id || '');
      })
      .catch((e: any) => setError(e?.error?.message || 'Failed to load prompt'))
      .finally(() => setLoading(false));
  }, [promptId]);

  const a = useMemo(
    () => data?.versions.find((v) => v.id === aId) || null,
    [data, aId],
  );
  const b = useMemo(
    () => data?.versions.find((v) => v.id === bId) || null,
    [data, bId],
  );

  const diff = useMemo(() => {
    if (!a || !b) return [];
    return diffLines(a.content, b.content);
  }, [a, b]);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
      >
        <h1 style={{ margin: 0 }}>Compare Versions</h1>
        <div>
          <Link to={`/prompts/${promptId}`}>Back to prompt</Link>
        </div>
      </div>

      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}
      {error ? (
        <div style={{ marginTop: 12, color: 'crimson' }}>{error}</div>
      ) : null}

      {data ? (
        <>
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ color: '#666', fontSize: 12 }}>A</div>
            <select value={aId} onChange={(e) => setAId(e.target.value)}>
              {data.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version}
                </option>
              ))}
            </select>

            <div style={{ color: '#666', fontSize: 12 }}>B</div>
            <select value={bId} onChange={(e) => setBId(e.target.value)}>
              {data.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              marginTop: 16,
              border: '1px solid #eee',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <div
              style={{
                padding: 10,
                borderBottom: '1px solid #eee',
                background: '#fafafa',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: '#666' }}>
                Showing line diff: A (base) vs B (compare)
              </div>
            </div>

            <pre
              style={{
                margin: 0,
                padding: 12,
                whiteSpace: 'pre-wrap',
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {diff.map((d, idx) => {
                const prefix =
                  d.type === 'add' ? '+' : d.type === 'del' ? '-' : ' ';
                const bg =
                  d.type === 'add'
                    ? '#ecfdf5'
                    : d.type === 'del'
                      ? '#fef2f2'
                      : 'transparent';
                const color =
                  d.type === 'add'
                    ? '#047857'
                    : d.type === 'del'
                      ? '#b91c1c'
                      : '#111';
                return (
                  <div key={idx} style={{ background: bg, color }}>
                    {prefix} {d.text}
                  </div>
                );
              })}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
