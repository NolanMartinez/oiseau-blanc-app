import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MapPin, Star, ClipboardList, Vote, User, ArrowLeft, Bell, BellOff } from 'lucide-react';
import { useUserAuth } from '../../context/UserAuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const NAV = [
  { to: '/app/carte', label: 'Carte', Icon: MapPin },
  { to: '/app/avis', label: 'Avis', Icon: Star },
  { to: '/app/sondages', label: 'Sondages', Icon: ClipboardList },
  { to: '/app/votes', label: 'Votes', Icon: Vote },
  { to: '/app/profil', label: 'Profil', Icon: User },
];

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  mapMode?: boolean;
  back?: boolean;
}

function BirdLogo({ size = 22 }: { size?: number }) {
  // Oiseau stylisé minimaliste
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 18 C 8 10, 14 7, 20 9 C 24 10, 27 13, 28 17 C 25 16, 22 16, 19 17 C 23 19, 26 22, 26 26 C 22 24, 17 23, 13 24 C 9 24, 6 22, 4 18 Z"
        fill="currentColor"
      />
      <circle cx="24" cy="13" r="0.9" fill="var(--cream)" />
    </svg>
  );
}

function BellButton() {
  const { subscriber } = useUserAuth();
  const { status, subscribe, unsubscribe } = usePushNotifications(!!subscriber);

  if (status === 'unsupported') return null;

  const isSubscribed = status === 'subscribed';
  const isDenied = status === 'denied';
  const isLoading = status === 'loading';

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading || isDenied}
      title={
        isDenied ? 'Notifications bloquées par le navigateur'
        : isSubscribed ? 'Désactiver les notifications'
        : 'Activer les notifications'
      }
      className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all"
      style={{
        background: isSubscribed ? 'var(--forest)' : 'var(--cream-light)',
        border: `1px solid ${isSubscribed ? 'var(--forest)' : 'var(--line)'}`,
        opacity: isDenied || isLoading ? 0.5 : 1,
      }}
      aria-label={isSubscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
    >
      {isSubscribed
        ? <Bell size={16} style={{ color: 'var(--ivory)' }} strokeWidth={2} />
        : isDenied
        ? <BellOff size={16} style={{ color: 'var(--ink-faint)' }} strokeWidth={1.8} />
        : <Bell size={16} style={{ color: 'var(--ink-faint)' }} strokeWidth={1.8} />
      }
    </button>
  );
}

export function AppLayout({ children, title, mapMode = false, back = false }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 h-16 flex items-center px-5 gap-3 z-20"
        style={{ background: 'var(--cream)', borderBottom: '1px solid var(--line)' }}
      >
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all hover:scale-95"
            style={{ background: 'var(--cream-light)', border: '1px solid var(--line)' }}
            aria-label="Retour"
          >
            <ArrowLeft size={17} strokeWidth={2} style={{ color: 'var(--ink)' }} />
          </button>
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--forest)', color: 'var(--ivory)' }}
          >
            <BirdLogo size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {title ? (
            <span
              className="font-serif text-[17px] truncate leading-tight"
              style={{ color: 'var(--ink)', fontWeight: 600, letterSpacing: '-0.02em' }}
            >
              {title}
            </span>
          ) : (
            <>
              <span
                className="text-[10px] uppercase tracking-[0.22em] leading-none"
                style={{ color: 'var(--ink-faint)', fontWeight: 600 }}
              >
                Traiteur
              </span>
              <span
                className="font-serif text-[17px] leading-tight mt-0.5"
                style={{ color: 'var(--ink)', fontWeight: 600, letterSpacing: '-0.02em' }}
              >
                L'Oiseau Blanc
              </span>
            </>
          )}
        </div>
        <BellButton />
      </header>

      {/* Content */}
      <main
        className={`flex-1 ${mapMode ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ background: 'var(--cream)' }}
      >
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="flex-shrink-0 flex z-20"
        style={{
          background: 'var(--cream)',
          borderTop: '1px solid var(--line)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="flex-1 relative">
            {({ isActive }) => (
              <div className="flex flex-col items-center pt-3 pb-3 gap-1.5 transition-all">
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full"
                    style={{ background: 'var(--forest)' }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? 'var(--forest)' : 'var(--ink-faint)' }}
                />
                <span
                  className="text-[10px] leading-none tracking-wide"
                  style={{
                    color: isActive ? 'var(--forest)' : 'var(--ink-faint)',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
