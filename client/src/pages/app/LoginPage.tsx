import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { AppLayout, FriggoWordmark } from '../../components/app/AppLayout';
import { userApi } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';
import type { Subscriber } from '../../context/UserAuthContext';

type Step = 'contact' | 'code';

export function LoginPage() {
  const { login } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/app/avis';

  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!contact.trim()) { setError('Veuillez renseigner votre email ou téléphone.'); return; }
    setLoading(true);
    try {
      const res = await userApi.post('/public/user/auth/request-otp', { contact: contact.trim() });
      if (res.data._devCode) setDevCode(res.data._devCode);
      setStep('code');
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) { setError('Le code doit contenir 6 chiffres.'); return; }
    setLoading(true);
    try {
      const res = await userApi.post('/public/user/auth/verify-otp', {
        contact: contact.trim(),
        code: code.trim(),
      });
      login(res.data.token, res.data.subscriber as Subscriber);
      navigate(next, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 401 ? 'Code invalide ou expiré.' : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setCode('');
    setDevCode(null);
    setLoading(true);
    try {
      const res = await userApi.post('/public/user/auth/request-otp', { contact: contact.trim() });
      if (res.data._devCode) setDevCode(res.data._devCode);
    } catch {
      setError('Impossible de renvoyer le code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout back title="Connexion">
      {step === 'contact' ? (
        <div className="px-6 pt-10 pb-6 fade-up">
          <div className="mb-6">
            <FriggoWordmark size={36} />
            <p
              className="text-[12px] mt-1"
              style={{ color: '#d49b00', fontWeight: 700, letterSpacing: '0.01em' }}
            >
              C'est bien fait, pour vous
            </p>
          </div>
          <h1 className="text-titre-gros mb-3" style={{ color: 'var(--ink)' }}>
            Identifiez-<br />vous
          </h1>
          <p className="text-texte mb-10" style={{ color: 'var(--ink-soft)', maxWidth: '28ch' }}>
            Nous vous enverrons un code à 6 chiffres pour confirmer votre identité.
          </p>

          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <label className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-3" style={{ color: 'var(--ink-faint)' }}>
                Email ou téléphone
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="votre@email.fr"
                autoFocus
                className="w-full py-4 px-5 rounded-2xl text-[15px] focus:outline-none transition-all"
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                }}
              />
            </div>

            {error && (
              <p
                className="text-[13px] rounded-xl px-4 py-3"
                style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="text-cta w-full rounded-full py-4 disabled:opacity-50 transition-all hover:scale-[0.99] flex items-center justify-center gap-2"
              style={{
                background: 'var(--green)',
                color: '#ffffff',
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(49,153,102,0.28)',
              }}
            >
              {loading ? 'Envoi…' : <>Recevoir le code <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      ) : (
        <div className="px-6 pt-10 pb-6 fade-up">
          <p className="text-[11px] uppercase tracking-[0.05em] font-semibold mb-3" style={{ color: 'var(--green)' }}>
            Vérification
          </p>
          <h1 className="text-titre-gros mb-3" style={{ color: 'var(--ink)' }}>
            Votre<br />code
          </h1>
          <p className="text-texte mb-2" style={{ color: 'var(--ink-soft)' }}>
            Code envoyé à
          </p>
          <p className="text-[15px] font-semibold mb-8" style={{ color: 'var(--ink)' }}>
            {contact}
          </p>

          {devCode && (
            <div
              className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between"
              style={{ background: 'var(--yellow-soft)', border: '1px dashed var(--yellow)' }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#a17600' }}>
                  Mode dev
                </p>
                <p className="text-xl tracking-wider" style={{ color: 'var(--ink)', fontWeight: 800 }}>
                  {devCode}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="text-[11px] uppercase tracking-[0.05em] font-semibold block mb-3" style={{ color: 'var(--ink-faint)' }}>
                Code à 6 chiffres
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                className="w-full py-5 px-5 rounded-2xl text-3xl tracking-[0.5em] text-center focus:outline-none"
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  fontWeight: 800,
                }}
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] mt-4 mx-auto disabled:opacity-40"
                style={{ color: 'var(--green)', fontWeight: 600 }}
              >
                <RefreshCw size={11} />
                Renvoyer le code
              </button>
            </div>

            {error && (
              <p
                className="text-[13px] rounded-xl px-4 py-3"
                style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="text-cta w-full rounded-full py-4 disabled:opacity-50 transition-all hover:scale-[0.99]"
              style={{
                background: 'var(--green)',
                color: '#ffffff',
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(49,153,102,0.28)',
              }}
            >
              {loading ? 'Vérification…' : 'Confirmer'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('contact'); setCode(''); setError(''); }}
              className="w-full flex items-center justify-center gap-1.5 text-[13px]"
              style={{ color: 'var(--ink-faint)', fontWeight: 500 }}
            >
              <ArrowLeft size={13} /> Changer de contact
            </button>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
