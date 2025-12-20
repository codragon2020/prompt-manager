import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getToken } from '../../api/client';
import { extractVariables, renderTemplate } from '../lib/renderPrompt';

type PromptDetail = Awaited<ReturnType<typeof api.getPrompt>>;

export function PromptDetailPage() {
  const params = useParams();
  const promptId = params.promptId || '';

  const [data, setData] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  const [publishEnv, setPublishEnv] = useState('prod');
  const [publishNotes, setPublishNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);

  const pubByEnv = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data?.publications || []) {
      map.set(p.env, p.promptVersionId);
    }
    return map;
  }, [data]);

  const selectedVersion = useMemo(() => {
    if (!data) return null;
    const id = selectedVersionId || data.versions[0]?.id;
    return data.versions.find((v) => v.id === id) || data.versions[0] || null;
  }, [data, selectedVersionId]);

  const templateVars = useMemo(() => {
    return selectedVersion ? extractVariables(selectedVersion.content) : [];
  }, [selectedVersion]);

  const missingVars = useMemo(() => {
    const missing: string[] = [];
    for (const v of templateVars) {
      if (!previewVars[v] || previewVars[v].trim().length === 0)
        missing.push(v);
    }
    return missing;
  }, [templateVars, previewVars]);

  const rendered = useMemo(() => {
    return selectedVersion
      ? renderTemplate(selectedVersion.content, previewVars)
      : '';
  }, [selectedVersion, previewVars]);

  useEffect(() => {
    if (!promptId) return;
    setLoading(true);
    setError(null);
    api
      .getPrompt(promptId)
      .then((d) => setData(d))
      .catch((e: any) => setError(e?.error?.message || 'Failed to load prompt'))
      .finally(() => setLoading(false));
  }, [promptId]);

  if (!promptId) {
    return <div style={{ padding: 24 }}>Missing promptId</div>;
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{data?.name || 'Prompt'}</h1>
          <div style={{ color: '#666', marginTop: 6 }}>
            {data?.description || ''}
          </div>
        </div>
        <div>
          <Link to={`/prompts/${promptId}/compare`} style={{ marginRight: 12 }}>
            Compare versions
          </Link>
          <Link to="/prompts">Back to list</Link>
        </div>
      </div>

      {loading ? <div style={{ marginTop: 16 }}>Loading…</div> : null}
      {error ? (
        <div style={{ marginTop: 16, color: 'crimson' }}>{error}</div>
      ) : null}

      {data ? (
        <>
          <div
            style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {['dev', 'stage', 'prod'].map((env) => (
              <div
                key={env}
                style={{
                  border: '1px solid #eee',
                  background: '#fff',
                  borderRadius: 8,
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontSize: 12, color: '#666' }}>{env}</div>
                <div style={{ fontWeight: 600 }}>
                  {pubByEnv.get(env) ? `Published` : '—'}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Actions</h2>

            {!getToken() ? (
              <div style={{ color: '#666' }}>
                Login to create versions or publish.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  disabled={creatingVersion || !selectedVersion}
                  onClick={async () => {
                    if (!selectedVersion) return;
                    setCreatingVersion(true);
                    setError(null);
                    try {
                      await api.createVersion(promptId, {
                        fromVersionId: selectedVersion.id,
                        notes: `Forked from v${selectedVersion.version}`,
                      });
                      const refreshed = await api.getPrompt(promptId);
                      setData(refreshed);
                      setSelectedVersionId('');
                    } catch (e: any) {
                      setError(e?.error?.message || 'Failed to create version');
                    } finally {
                      setCreatingVersion(false);
                    }
                  }}
                >
                  {creatingVersion ? 'Creating…' : 'New Version (fork)'}
                </button>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={publishEnv}
                    onChange={(e) => setPublishEnv(e.target.value)}
                  >
                    <option value="dev">dev</option>
                    <option value="stage">stage</option>
                    <option value="prod">prod</option>
                  </select>
                  <input
                    placeholder="Release notes (optional)"
                    value={publishNotes}
                    onChange={(e) => setPublishNotes(e.target.value)}
                    style={{ width: 260 }}
                  />
                  <button
                    disabled={publishing || !selectedVersion}
                    onClick={async () => {
                      if (!selectedVersion) return;
                      setPublishing(true);
                      setError(null);
                      try {
                        await api.publish(promptId, {
                          env: publishEnv,
                          promptVersionId: selectedVersion.id,
                          notes: publishNotes.trim() || undefined,
                        });
                        const refreshed = await api.getPrompt(promptId);
                        setData(refreshed);
                      } catch (e: any) {
                        setError(e?.error?.message || 'Failed to publish');
                      } finally {
                        setPublishing(false);
                      }
                    }}
                  >
                    {publishing ? 'Publishing…' : 'Publish selected version'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Render Preview</h2>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ color: '#666', fontSize: 12 }}>
                  Selected version
                </div>
                <select
                  value={selectedVersion?.id || ''}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                >
                  {data.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version}
                    </option>
                  ))}
                </select>
              </div>

              {templateVars.length === 0 ? (
                <div style={{ marginTop: 10, color: '#666' }}>
                  No {'{{variables}}'} found.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  {templateVars.map((v) => (
                    <label key={v} style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 12, color: '#666' }}>{v}</div>
                      <input
                        value={previewVars[v] || ''}
                        onChange={(e) =>
                          setPreviewVars((prev) => ({
                            ...prev,
                            [v]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              )}

              {missingVars.length > 0 ? (
                <div style={{ marginTop: 10, color: '#b45309' }}>
                  Missing values for: {missingVars.join(', ')}
                </div>
              ) : null}
            </div>

            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Rendered Prompt</h2>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {rendered}
              </pre>
            </div>
          </div>

          <h2 style={{ marginTop: 24 }}>Versions</h2>
          <div
            style={{
              border: '1px solid #eee',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
              }}
            >
              <thead>
                <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                    Version
                  </th>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                    Created
                  </th>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                    Model
                  </th>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                    Notes
                  </th>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.versions.map((v) => (
                  <tr key={v.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                      v{v.version}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                      {new Date(v.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                      {v.modelName || '—'}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                      {v.notes || '—'}
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                      <Link
                        to={`/prompts/${promptId}/versions/new?from=${encodeURIComponent(v.id)}`}
                      >
                        New from this
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
