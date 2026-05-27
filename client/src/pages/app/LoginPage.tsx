import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { FriggoWordmark } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';
import { useLang } from '../../context/LanguageContext';
import type { Subscriber } from '../../context/UserAuthContext';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { login, subscriber } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/app/mon-frigo';
  const { t } = useLang();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subscriber) navigate(next, { replace: true });
  }, [subscriber, navigate, next]);

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError(t('error_email_required')); return; }
    if (password.length < 6) { setError(t('error_password_min')); return; }
    if (mode === 'register' && password !== confirm) {
      setError(t('error_passwords_mismatch'));
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/public/user/auth/login' : '/public/user/auth/register';
      const res = await userApi.post(endpoint, { email: email.trim(), password });
      login(res.data.token, res.data.subscriber as Subscriber);
      navigate(next, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 409) setError(t('error_email_taken'));
      else if (status === 401) setError(t('error_credentials'));
      else setError(msg ?? t('error_generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--cream)', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
    >
      <div className="px-8 pt-14 pb-8">
        <FriggoWordmark size={42} />
        <p className="text-[12px] mt-1.5" style={{ color: '#d49b00', fontWeight: 700, letterSpacing: '0.01em' }}>
          {t('tagline')}
        </p>
      </div>

      <div className="mx-4 rounded-3xl p-6 flex-1 flex flex-col" style={{ background: '#ffffff', border: '1px solid var(--line)' }}>
        <div className="flex rounded-2xl p-1 mb-7" style={{ background: 'var(--cream)' }}>
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-2.5 rounded-xl text-[13px] transition-all"
              style={{
                background: mode === m ? '#ffffff' : 'transparent',
                color: mode === m ? 'var(--ink)' : 'var(--ink-faint)',
                fontWeight: mode === m ? 700 : 500,
                boxShadow: mode === m ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'login' ? t('sign_in') : t('create_account')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div>
            <label className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-2" style={{ color: 'var(--ink-faint)' }}>
              {t('email_label')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              autoComplete="email"
              autoFocus
              className="w-full py-3.5 px-4 rounded-2xl text-[15px] focus:outline-none"
              style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-2" style={{ color: 'var(--ink-faint)' }}>
              {t('password_label')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password_placeholder')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full py-3.5 px-4 pr-12 rounded-2xl text-[15px] focus:outline-none"
                style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
                style={{ color: 'var(--ink-faint)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-2" style={{ color: 'var(--ink-faint)' }}>
                {t('confirm_password_label')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('repeat_password_placeholder')}
                autoComplete="new-password"
                className="w-full py-3.5 px-4 rounded-2xl text-[15px] focus:outline-none"
                style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>
          )}

          {error && (
            <p className="text-[13px] rounded-xl px-4 py-3" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}>
              {error}
            </p>
          )}

          <div className="flex-1" />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-4 disabled:opacity-50 transition-all hover:scale-[0.99] flex items-center justify-center gap-2"
            style={{ background: 'var(--green)', color: '#ffffff', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 24px rgba(49,153,102,0.28)' }}
          >
            {loading
              ? t('loading')
              : mode === 'login'
              ? <><span>{t('sign_in')}</span> <ArrowRight size={16} /></>
              : <><span>{t('create_my_account')}</span> <ArrowRight size={16} /></>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
