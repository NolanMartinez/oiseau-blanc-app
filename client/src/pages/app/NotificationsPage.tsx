import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useLang } from '../../context/LanguageContext';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t('just_now');
    if (m < 60) return t('minutes_ago', m);
    const h = Math.floor(m / 60);
    if (h < 24) return t('hours_ago', h);
    const d = Math.floor(h / 24);
    if (d < 7) return t('days_ago', d);
    const localeMap: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', pt: 'pt-BR', de: 'de-DE', it: 'it-IT' };
    return new Date(dateStr).toLocaleDateString(localeMap[lang] ?? 'fr-FR', { day: 'numeric', month: 'short' });
  }

  useEffect(() => {
    userApi.get('/public/user/notifications')
      .then((res) => setNotifications(res.data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
    userApi.patch('/public/user/notifications/seen').catch(() => {});
  }, []);

  return (
    <AppLayout back title={t('notifications')}>
      <div className="px-6 pt-6 pb-10 fade-up">
        {loading ? (
          <p className="text-[13px] text-center py-16" style={{ color: 'var(--ink-faint)' }}>
            {t('loading')}
          </p>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}>
              <Bell size={22} style={{ color: 'var(--ink-faint)' }} strokeWidth={1.6} />
            </div>
            <p className="text-[14px] text-center" style={{ color: 'var(--ink-soft)' }}>
              {t('no_notifications')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => n.url && navigate(n.url)}
                className="w-full text-left rounded-3xl p-4 flex gap-3 items-start transition-all hover:scale-[0.99] active:scale-[0.98]"
                style={{ background: '#ffffff', border: '1px solid var(--line)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--green)' }}>
                  <Bell size={15} color="#fff" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] leading-snug" style={{ color: 'var(--ink)', fontWeight: 700 }}>{n.title}</p>
                    <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] mt-1 leading-snug" style={{ color: 'var(--ink-soft)' }}>{n.body}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
