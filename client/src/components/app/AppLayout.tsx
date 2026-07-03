import { type ReactNode, useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Refrigerator, Star, Gift, User, ArrowLeft, Bell } from 'lucide-react';
import { useUserAuth } from '../../context/UserAuthContext';
import { userApi } from '../../services/api';
import { useLang, SUPPORTED_LANGS, type LangCode } from '../../context/LanguageContext';

const NAV_ROUTES = [
  { to: '/app/mon-frigo', key: 'nav_fridge', Icon: Refrigerator },
  { to: '/app/avis', key: 'nav_review', Icon: Star },
  { to: '/app/fidelite', key: 'nav_loyalty', Icon: Gift },
  { to: '/app/profil', key: 'nav_profile', Icon: User },
];

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  mapMode?: boolean;
  back?: boolean;
}

// Wordmark Friggo (Frig bleu + go vert)
export function FriggoWordmark({ size = 17 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "'Sonny Vol 2', 'Onest', sans-serif",
        fontWeight: 900,
        fontSize: size,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: 'var(--blue)' }}>Frig</span>
      <span style={{ color: 'var(--green)' }}>go</span>
    </span>
  );
}

function BellButton() {
  const { subscriber } = useUserAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!subscriber) return;
    userApi.get('/public/user/notifications')
      .then((res) => setUnread(res.data.unreadCount ?? 0))
      .catch(() => {});
  }, [subscriber]);

  if (!subscriber) return null;

  return (
    <button
      onClick={() => { setUnread(0); navigate('/app/notifications'); }}
      className="relative w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-95"
      style={{ background: '#ffffff', border: '1px solid var(--line)' }}
      aria-label="Notifications"
    >
      <Bell size={16} style={{ color: 'var(--ink-faint)' }} strokeWidth={1.8} />
      {unread > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: '#ef4444', color: '#ffffff', lineHeight: 1 }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}

function LanguagePicker() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 flex items-center justify-center rounded-full text-lg transition-all active:scale-95"
        style={{ background: '#ffffff', border: '1px solid var(--line)' }}
        aria-label="Changer la langue"
      >
        {SUPPORTED_LANGS.find((l) => l.code === lang)?.flag}
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 rounded-2xl py-1 z-50 min-w-[148px]"
          style={{ background: '#ffffff', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid var(--line)' }}
        >
          {SUPPORTED_LANGS.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => { setLang(code as LangCode); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5"
              style={{
                color: code === lang ? 'var(--green)' : 'var(--ink)',
                fontWeight: code === lang ? 700 : 500,
                background: code === lang ? 'var(--green-soft)' : 'transparent',
              }}
            >
              <span className="text-base">{flag}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children, title, mapMode = false, back = false }: AppLayoutProps) {
  const navigate = useNavigate();
  const { subscriber } = useUserAuth();
  const { t } = useLang();
  const NAV = NAV_ROUTES.map(({ to, key, Icon }) => ({ to, label: t(key), Icon }));

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 z-20"
        style={{ background: '#ffffff', borderBottom: '1px solid var(--line)', paddingTop: 'env(safe-area-inset-top)' }}
      >
      <div className="h-16 flex items-center px-5 gap-3">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all hover:scale-95"
            style={{ background: '#ffffff', border: '1px solid var(--line)' }}
            aria-label="Retour"
          >
            <ArrowLeft size={17} strokeWidth={2} style={{ color: 'var(--ink)' }} />
          </button>
        ) : (
          <FriggoWordmark size={24} />
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {title && (
            <span
              className="text-[16px] truncate leading-tight"
              style={{ color: 'var(--ink)', fontWeight: 800 }}
            >
              {title}
            </span>
          )}
        </div>
        <LanguagePicker />
        <BellButton />
      </div>
      </header>

      {/* Content */}
      <main
        className={`flex-1 ${mapMode ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ background: 'var(--cream)' }}
      >
        {children}
      </main>

      {/* Bottom nav — uniquement si connecté */}
      {subscriber && (
        <nav
          className="flex-shrink-0 flex z-20"
          style={{
            background: '#ffffff',
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
                      style={{ background: 'var(--green)' }}
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    style={{ color: isActive ? 'var(--green)' : 'var(--ink-faint)' }}
                  />
                  <span
                    className="text-cta-navbar"
                    style={{
                      color: isActive ? 'var(--green)' : 'var(--ink-faint)',
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
