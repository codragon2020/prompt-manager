import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export function CreatePromptPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerTeam, setOwnerTeam] = useState('');
  const [tags, setTags] = useState('');

  const [content, setContent] = useState('');
  const [modelName, setModelName] = useState('');
  const [temperature, setTemperature] = useState('0.3');
  const [maxTokens, setMaxTokens] = useState('400');
  const [topP, setTopP] = useState('1');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && content.trim().length > 0,
    [name, content],
  );

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Create Prompt</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          style={{
            border: '1px solid #eee',
            background: '#fff',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Metadata</h2>

          <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div>Description</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div>Owner / Team</div>
            <input
              value={ownerTeam}
              onChange={(e) => setOwnerTeam(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div>Tags (comma-separated)</div>
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
        </div>

        <div
          style={{
            border: '1px solid #eee',
            background: '#fff',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Initial Version</h2>

          <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div>Content</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            />
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginTop: 10,
            }}
          >
            <label style={{ display: 'grid', gap: 6 }}>
              <div>Model</div>
              <input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <div>Temperature</div>
              <input
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <div>Max tokens</div>
              <input
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <div>Top P</div>
              <input value={topP} onChange={(e) => setTopP(e.target.value)} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div>Notes</div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {error ? (
            <div style={{ marginTop: 10, color: 'crimson' }}>{error}</div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => navigate('/prompts')}>Cancel</button>
            <button
              disabled={!canSubmit || submitting}
              onClick={async () => {
                setError(null);
                setSubmitting(true);
                try {
                  const tagList = tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);

                  const created = await api.createPrompt({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    ownerTeam: ownerTeam.trim() || undefined,
                    tags: tagList,
                    initialVersion: {
                      content: content,
                      modelName: modelName.trim() || undefined,
                      temperature: temperature.trim()
                        ? Number(temperature)
                        : undefined,
                      maxTokens: maxTokens.trim()
                        ? Number(maxTokens)
                        : undefined,
                      topP: topP.trim() ? Number(topP) : undefined,
                      notes: notes.trim() || undefined,
                      variables: [],
                    },
                  });

                  navigate(`/prompts/${created.id}`);
                } catch (e: any) {
                  setError(e?.error?.message || 'Failed to create prompt');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
