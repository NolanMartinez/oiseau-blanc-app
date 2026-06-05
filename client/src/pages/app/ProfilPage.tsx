import { useState, useEffect } from 'react';
import { Lock, LogOut, Mail, Phone, Bell, Check, Refrigerator, X, ChevronRight, Download, Trash2, Activity, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';
import { useLang, SUPPORTED_LANGS } from '../../context/LanguageContext';

interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
}

function Toggle({ checked, onChange, loading }: { checked: boolean; onChange: (v: boolean) => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !loading && onChange(!checked)}
      className="relative flex-shrink-0 transition-all"
      style={{ width: 46, height: 28, borderRadius: 999, background: checked ? 'var(--green)' : 'var(--line)', border: 'none', opacity: loading ? 0.6 : 1 }}
      aria-pressed={checked}
    >
      <div
        className="absolute top-1 transition-all"
        style={{ left: checked ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
      />
    </button>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 mb-3 mt-6">
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      <span className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--ink-faint)', fontWeight: 700 }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="rounded-2xl" style={{ background: '#ffffff', border: '1px solid var(--line)', ...style }}>
      {children}
    </div>
  );
}

export function ProfilPage() {
  const { subscriber, isLoading: authLoading, logout, updateSubscriber } = useUserAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();

  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [showFridgeSheet, setShowFridgeSheet] = useState(false);
  const [savingFridge, setSavingFridge] = useState(false);
  const [savingNotif, setSavingNotif] = useState<'email' | 'push' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);

  useEffect(() => {
    userApi.get('/public/frigos').then((res) => setFridges(res.data.fridges ?? [])).catch(() => {});
  }, []);

  async function handleToggleNotif(field: 'consentEmail' | 'consentPush', value: boolean) {
    setSavingNotif(field === 'consentEmail' ? 'email' : 'push');
    try {
      await userApi.patch('/public/user/auth/me', { [field]: value });
      updateSubscriber({ [field]: value });
    } finally {
      setSavingNotif(null);
    }
  }

  async function handleSelectFridge(frigoId: string) {
    setSavingFridge(true);
    try {
      await userApi.patch('/public/user/auth/frigo-favori', { frigoId });
      updateSubscriber({ favoriId: frigoId });
      setShowFridgeSheet(false);
    } finally {
      setSavingFridge(false);
    }
  }

  async function handleDownloadData() {
    setDownloadingData(true);
    try {
      const res = await userApi.get('/public/user/auth/my-data', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mes-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingData(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await userApi.delete('/public/user/auth/me');
      logout();
      navigate('/app/login');
    } catch {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  }

  if (authLoading) {
    return (
      <AppLayout title={t('my_profile')}>
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--ink-faint)' }}>
          {t('loading')}
        </div>
      </AppLayout>
    );
  }

  if (!subscriber) {
    return (
      <AppLayout title={t('my_profile')}>
        <div className="flex flex-col items-center justify-center px-6 pt-20 text-center fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--green-soft)' }}>
            <Lock size={22} style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="text-titre mb-4" style={{ color: 'var(--ink)' }}>{t('sign_in_title')}</h2>
          <p className="text-texte mb-10 max-w-xs" style={{ color: 'var(--ink-soft)' }}>{t('sign_in_to_profile')}</p>
          <button
            onClick={() => navigate('/app/login?next=/app/profil')}
            className="text-cta px-10 py-4 rounded-full transition-all hover:scale-[0.98]"
            style={{ background: 'var(--green)', color: '#ffffff', fontWeight: 700, boxShadow: '0 8px 24px rgba(49,153,102,0.28)' }}
          >
            {t('sign_in')}
          </button>
        </div>
      </AppLayout>
    );
  }

  const initial = (subscriber.email ?? subscriber.phone ?? '?').charAt(0).toUpperCase();
  const favoriteFridge = fridges.find((f) => f.id === subscriber.favoriId);

  const memberSince = subscriber.createdAt
    ? new Date(subscriber.createdAt).toLocaleDateString(
        lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-BR' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : 'en-US',
        { month: 'long', year: 'numeric' },
      )
    : null;

  return (
    <AppLayout title={t('my_profile')}>
      <div className="pb-12 fade-up">

        {/* ── Header profil ── */}
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--green)', color: '#ffffff' }}>
            <span style={{ fontSize: 30, fontWeight: 800 }}>{initial}</span>
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2 }}>
            {subscriber.email ?? subscriber.phone}
          </p>
          <div className="flex items-center gap-1.5 mt-1" style={{ color: 'var(--ink-faint)', fontSize: 12 }}>
            {subscriber.email ? <Mail size={11} /> : <Phone size={11} />}
            <span>{t('login_identifier')}</span>
          </div>
          {memberSince && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
              {t('member_since')} {memberSince}
            </p>
          )}
        </div>

        {/* ── Mon compte ── */}
        <SectionDivider label={t('account_section')} />
        <div className="px-6">
          <Card>
            <button
              onClick={() => setShowFridgeSheet(true)}
              className="w-full flex items-center gap-4 p-5 transition-all hover:bg-gray-50 rounded-2xl"
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--green-soft)' }}>
                <Refrigerator size={16} style={{ color: 'var(--green)' }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 700 }}>{t('favorite_fridge')}</p>
                <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
                  {favoriteFridge ? favoriteFridge.name : t('no_favorite_fridge')}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
            </button>
          </Card>
        </div>

        {/* ── Notifications ── */}
        <SectionDivider label={t('notifications_section')} />
        <div className="px-6 space-y-3">
          <Card>
            <div className="flex items-center gap-4 p-5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--blue-soft)' }}>
                <Mail size={16} style={{ color: '#2a93c7' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 700 }}>{t('email_notifications')}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{t('email_notifications_desc')}</p>
              </div>
              <Toggle
                checked={subscriber.consentEmail}
                onChange={(v) => handleToggleNotif('consentEmail', v)}
                loading={savingNotif === 'email'}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4 p-5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--green-soft)' }}>
                <Bell size={16} style={{ color: 'var(--green)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 700 }}>{t('push_notifications')}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{t('push_notifications_desc')}</p>
              </div>
              <Toggle
                checked={subscriber.consentPush}
                onChange={(v) => handleToggleNotif('consentPush', v)}
                loading={savingNotif === 'push'}
              />
            </div>
          </Card>
        </div>

        {/* ── Langue ── */}
        <SectionDivider label={t('language_pref')} />
        <div className="px-6">
          <Card style={{ padding: '14px 16px' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0f0f8' }}>
                <Globe size={16} style={{ color: '#5a5fc7' }} />
              </div>
              <p className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 700 }}>{t('language_pref')}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUPPORTED_LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  style={{
                    padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: lang === l.code ? 700 : 500,
                    background: lang === l.code ? 'var(--green)' : 'var(--cream)',
                    color: lang === l.code ? '#ffffff' : 'var(--ink)',
                    border: `1px solid ${lang === l.code ? 'var(--green)' : 'var(--line)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {l.flag} {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Mon activité ── */}
        {(subscriber.reviewsCount !== undefined || subscriber.surveysCount !== undefined) && (
          <>
            <SectionDivider label={t('my_activity')} />
            <div className="px-6">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Card style={{ padding: '16px', textAlign: 'center' }}>
                  <div className="flex items-center justify-center mb-2" style={{ color: 'var(--green)' }}>
                    <Activity size={18} />
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{subscriber.reviewsCount ?? 0}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>{t('reviews_written')}</p>
                </Card>
                <Card style={{ padding: '16px', textAlign: 'center' }}>
                  <div className="flex items-center justify-center mb-2" style={{ color: '#6366f1' }}>
                    <Activity size={18} />
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{subscriber.surveysCount ?? 0}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>{t('surveys_answered')}</p>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* ── Mes données (RGPD) ── */}
        <SectionDivider label={t('my_data')} />
        <div className="px-6 space-y-3">
          <p className="text-[12px] px-1" style={{ color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            {t('data_stored_info')}
          </p>

          <Card>
            <button
              onClick={handleDownloadData}
              disabled={downloadingData}
              className="w-full flex items-center gap-4 p-5 transition-all hover:bg-gray-50 rounded-2xl disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#eff6ff' }}>
                <Download size={16} style={{ color: '#2563eb' }} />
              </div>
              <p className="flex-1 text-left text-[14px]" style={{ color: '#2563eb', fontWeight: 700 }}>
                {downloadingData ? t('saving') : t('download_my_data')}
              </p>
            </button>
          </Card>

          <Card>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center gap-4 p-5 transition-all hover:bg-red-50 rounded-2xl"
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#fdf1ef' }}>
                <Trash2 size={16} style={{ color: '#c53838' }} />
              </div>
              <p className="flex-1 text-left text-[14px]" style={{ color: '#c53838', fontWeight: 700 }}>
                {t('delete_account')}
              </p>
            </button>
          </Card>
        </div>

        {/* ── Déconnexion ── */}
        <div className="px-6 mt-8">
          <button
            onClick={() => { logout(); navigate('/app/login'); }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all hover:bg-gray-100"
            style={{ border: '1px solid var(--line)', background: 'transparent' }}
          >
            <LogOut size={14} style={{ color: 'var(--ink-faint)' }} />
            <span className="text-[14px]" style={{ color: 'var(--ink-faint)', fontWeight: 600 }}>{t('sign_out')}</span>
          </button>
        </div>
      </div>

      {/* ── Sheet : choisir un frigo ── */}
      {showFridgeSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '24px 24px 0 0', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 12px' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{t('choose_fridge_change')}</p>
              <button
                onClick={() => setShowFridgeSheet(false)}
                style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--line)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fridges.map((fridge) => {
                const isSelected = subscriber.favoriId === fridge.id;
                return (
                  <button
                    key={fridge.id}
                    onClick={() => !savingFridge && handleSelectFridge(fridge.id)}
                    style={{
                      padding: '14px 16px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                      border: `2px solid ${isSelected ? 'var(--green)' : 'var(--line)'}`,
                      background: isSelected ? 'var(--green-soft)' : '#ffffff',
                      display: 'flex', alignItems: 'center', gap: 12, opacity: savingFridge ? 0.6 : 1,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{fridge.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{fridge.location}</p>
                    </div>
                    {isSelected && <Check size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : confirmation suppression ── */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--cream)', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px' }}>
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5 mx-auto" style={{ background: '#fdf1ef' }}>
              <Trash2 size={22} style={{ color: '#c53838' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', textAlign: 'center', marginBottom: 10 }}>
              {t('delete_account_confirm_title')}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, textAlign: 'center', marginBottom: 28 }}>
              {t('delete_account_warning')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{ padding: '16px', borderRadius: 999, background: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: deletingAccount ? 0.6 : 1 }}
              >
                {deletingAccount ? t('saving') : t('delete_account_confirm_btn')}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '16px', borderRadius: 999, background: 'transparent', color: 'var(--ink)', fontWeight: 600, fontSize: 15, border: '1px solid var(--line)', cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
