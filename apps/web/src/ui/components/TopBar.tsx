import { Link, useNavigate } from 'react-router-dom';
import { getToken, setToken } from '../../api/client';

export function TopBar() {
  const navigate = useNavigate();
  const token = getToken();

  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid #eee',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/prompts" style={{ textDecoration: 'none', color: '#111' }}>
            <strong>Prompt Manager</strong>
          </Link>
          <Link to="/prompts" style={{ textDecoration: 'none', color: '#111' }}>
            Prompts
          </Link>
          <Link
            to="/import-export"
            style={{ textDecoration: 'none', color: '#111' }}
          >
            Import/Export
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {token ? (
            <button
              onClick={() => {
                setToken(null);
                navigate('/login');
              }}
            >
              Logout
            </button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>
    </div>
  );
}
