import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MapPin, Star, ClipboardList, Vote, User, ArrowLeft } from 'lucide-react';

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

export function AppLayout({ children, title, mapMode = false, back = false }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col" style={{ background: '#f4f4f4' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 h-14 flex items-center px-4 gap-3 bg-white z-20"
        style={{ borderBottom: '1px solid #ececec' }}
      >
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: '#f2f2f2' }}
          >
            <ArrowLeft size={18} color="#111827" />
          </button>
        ) : (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#1a3d2b' }}
          >
            <span className="text-white font-black text-xs tracking-tight">OB</span>
          </div>
        )}
        <span className="font-black text-[15px] text-gray-900 flex-1 truncate leading-none">
          {title ?? "L'Oiseau Blanc"}
        </span>
      </header>

      {/* Content */}
      <main className={`flex-1 ${mapMode ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="flex-shrink-0 bg-white flex z-20"
        style={{ borderTop: '1px solid #ececec' }}
      >
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="flex-1">
            {({ isActive }) => (
              <div className="flex flex-col items-center pt-2 pb-3 gap-1">
                <div
                  className="w-12 h-7 flex items-center justify-center rounded-full transition-all"
                  style={isActive ? { background: '#e8f0ea' } : {}}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    color={isActive ? '#1a3d2b' : '#bdbdbd'}
                  />
                </div>
                <span
                  className="text-[10px] leading-none"
                  style={{ color: isActive ? '#1a3d2b' : '#bdbdbd', fontWeight: isActive ? 700 : 400 }}
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
