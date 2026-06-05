import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LivreurLayoutProps {
  children: ReactNode;
  title?: string;
  back?: boolean;
}

export function FriggoWordmark({ size = 32 }: { size?: number }) {
  return (
    <span style={{ fontSize: size, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
      <span style={{ color: '#70C8F2' }}>Frig</span>
      <span style={{ color: '#319966' }}>go</span>
    </span>
  );
}

export function LivreurLayout({ children, title, back }: LivreurLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream, #f5f5f0)', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e8e8e8',
          padding: '0 16px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {back ? (
          <button
            onClick={() => navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: 12, background: '#f5f5f0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ArrowLeft size={18} color="#3a3a3a" />
          </button>
        ) : (
          <FriggoWordmark size={26} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </p>
          )}
        </div>

        {!back && (
          <button
            onClick={handleLogout}
            style={{ width: 36, height: 36, borderRadius: 12, background: '#fdf1ef', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <LogOut size={16} color="#c53838" />
          </button>
        )}
      </header>

      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
