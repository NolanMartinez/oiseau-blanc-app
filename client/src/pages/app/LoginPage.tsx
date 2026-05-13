import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { FriggoWordmark } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';
import type { Subscriber } from '../../context/UserAuthContext';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { login, subscriber } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/app/mon-frigo';

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

    if (!email.trim()) { setError('Veuillez renseigner votre email.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (mode === 'register' && password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login'
        ? '/public/user/auth/login'
        : '/public/user/auth/register';
      const res = await userApi.post(endpoint, { email: email.trim(), password });
      login(res.data.token, res.data.subscriber as Subscriber);
      navigate(next, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 409) setError('Un compte existe déjà avec cet email.');
      else if (status === 401) setError('Email ou mot de passe incorrect.');
      else setError(msg ?? 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--cream)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
    >
      {/* Branding */}
      <div className="px-8 pt-14 pb-8">
        <FriggoWordmark size={42} />
        <p className="text-[12px] mt-1.5" style={{ color: '#d49b00', fontWeight: 700, letterSpacing: '0.01em' }}>
          C'est bien fait, pour vous
        </p>
      </div>

      {/* Card */}
      <div
        className="mx-4 rounded-3xl p-6 flex-1 flex flex-col"
        style={{ background: '#ffffff', border: '1px solid var(--line)' }}
      >
        {/* Mode toggle */}
        <div
          className="flex rounded-2xl p-1 mb-7"
          style={{ background: 'var(--cream)' }}
        >
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
              {m === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          {/* Email */}
          <div>
            <label
              className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-2"
              style={{ color: 'var(--ink-faint)' }}
            >
              Email
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

          {/* Mot de passe */}
          <div>
            <label
              className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-2"
              style={{ color: 'var(--ink-faint)' }}
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
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

          {/* Confirmer (register only) */}
          {mode === 'register' && (
            <div>
              <label
                className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-2"
                style={{ color: 'var(--ink-faint)' }}
              >
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Répétez le mot de passe"
                autoComplete="new-password"
                className="w-full py-3.5 px-4 rounded-2xl text-[15px] focus:outline-none"
                style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>
          )}

          {/* Erreur */}
          {error && (
            <p
              className="text-[13px] rounded-xl px-4 py-3"
              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}
            >
              {error}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-4 disabled:opacity-50 transition-all hover:scale-[0.99] flex items-center justify-center gap-2"
            style={{
              background: 'var(--green)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 15,
              boxShadow: '0 8px 24px rgba(49,153,102,0.28)',
            }}
          >
            {loading
              ? 'Chargement…'
              : mode === 'login'
              ? <><span>Se connecter</span> <ArrowRight size={16} /></>
              : <><span>Créer mon compte</span> <ArrowRight size={16} /></>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
