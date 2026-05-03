import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Star,
  ClipboardList,
  Vote,
  Bell,
  Refrigerator,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/frigos', icon: Refrigerator, label: 'Frigos & Plats' },
  { to: '/admin/subscribers', icon: UserCircle, label: 'Abonnés' },
  { to: '/admin/reviews', icon: Star, label: 'Avis' },
  { to: '/admin/surveys', icon: ClipboardList, label: 'Sondages' },
  { to: '/admin/votes', icon: Vote, label: 'Votes menus' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
];

const adminOnlyItems = [
  { to: '/admin/admins', icon: Users, label: 'Admins' },
];

export function Sidebar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-widest">Administration</p>
        <h1 className="text-base leading-tight mt-1" style={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#70C8F2' }}>Frig</span>
          <span style={{ color: '#319966' }}>go</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Section admins — super admin uniquement */}
        {admin?.role === 'SUPER_ADMIN' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Super admin</p>
            </div>
            {adminOnlyItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Profil + déconnexion */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold uppercase">
            {admin?.email?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white font-medium truncate">{admin?.email}</p>
            <p className="text-xs text-gray-400">{admin?.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full px-2 py-1.5 rounded hover:bg-gray-800"
        >
          <LogOut size={14} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
