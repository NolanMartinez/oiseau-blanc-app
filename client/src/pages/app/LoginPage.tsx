import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { AppLayout } from '../../components/app/AppLayout';
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
        <>
          <div className="bg-white px-4 pt-5 pb-5">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Identifiez-vous</h1>
            <p className="text-sm text-gray-500 mt-1">
              Entrez votre email ou téléphone — nous vous enverrons un code de vérification.
            </p>
          </div>

          <form onSubmit={handleRequestOtp}>
            <div className="bg-white mt-2 px-4 py-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                Email ou téléphone
              </p>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="votre@email.fr ou 06 00 00 00 00"
                autoFocus
                className="w-full py-3 px-4 rounded-xl text-sm text-gray-800 focus:outline-none"
                style={{ background: '#f2f2f2', border: 'none' }}
              />
            </div>

            <div
              className="sticky bottom-0 z-10 px-4 pt-10 pb-5"
              style={{ background: 'linear-gradient(to bottom, transparent, #f4f4f4 45%)' }}
            >
              {error && (
                <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-3">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-black rounded-2xl py-4 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#1a3d2b', boxShadow: '0 6px 20px rgba(26,61,43,0.35)' }}
              >
                {loading ? 'Envoi…' : <>Recevoir un code <ArrowRight size={16} /></>}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="bg-white px-4 pt-5 pb-5">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Code de vérification</h1>
            <p className="text-sm text-gray-500 mt-1">
              Entrez le code à 6 chiffres envoyé à <span className="font-semibold text-gray-700">{contact}</span>.
            </p>
            {devCode && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700">Mode dev — code : <span className="font-black text-lg">{devCode}</span></p>
              </div>
            )}
          </div>

          <form onSubmit={handleVerifyOtp}>
            <div className="bg-white mt-2 px-4 py-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Votre code</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full py-3 px-4 rounded-xl text-2xl font-black text-gray-900 tracking-[0.4em] text-center focus:outline-none"
                style={{ background: '#f2f2f2', border: 'none' }}
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-semibold mt-3 mx-auto disabled:opacity-40"
                style={{ color: '#1a3d2b' }}
              >
                <RefreshCw size={12} />
                Renvoyer le code
              </button>
            </div>

            <div
              className="sticky bottom-0 z-10 px-4 pt-10 pb-5"
              style={{ background: 'linear-gradient(to bottom, transparent, #f4f4f4 45%)' }}
            >
              {error && (
                <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-3">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full text-white font-black rounded-2xl py-4 text-sm disabled:opacity-50"
                style={{ background: '#1a3d2b', boxShadow: '0 6px 20px rgba(26,61,43,0.35)' }}
              >
                {loading ? 'Vérification…' : 'Confirmer'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('contact'); setCode(''); setError(''); }}
                className="w-full flex items-center justify-center gap-1.5 mt-3 text-sm font-semibold text-gray-400"
              >
                <ArrowLeft size={14} /> Changer de contact
              </button>
            </div>
          </form>
        </>
      )}
    </AppLayout>
  );
}
