import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Bannière « Installer l'application » : sur Android/Chrome, déclenche l'installation
// native (PWA) en un tap ; sur iPhone (Safari, sans event d'install), affiche la
// marche à suivre « Partager → Sur l'écran d'accueil ».
export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('install_dismissed') === '1');

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (isStandalone) return; // déjà installée → rien à proposer

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS/iPadOS : pas d'event d'installation → on montre les instructions manuelles.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) setShowIos(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed) return null;
  if (!deferred && !showIos) return null;

  function dismiss() {
    setDismissed(true);
    localStorage.setItem('install_dismissed', '1');
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    dismiss();
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: 'var(--green-soft)', borderBottom: '1px solid var(--line)' }}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--green)' }}
      >
        <Download size={16} color="#ffffff" />
      </div>

      <div className="min-w-0 flex-1">
        {deferred ? (
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            Installez l'application Friggo sur votre téléphone
          </p>
        ) : (
          <p className="text-[12px] leading-snug" style={{ color: 'var(--ink)' }}>
            <span className="font-semibold">Installer Friggo :</span> appuyez sur{' '}
            <Share size={12} className="inline align-[-2px]" /> <span className="font-semibold">Partager</span>{' '}
            puis <span className="font-semibold">« Sur l'écran d'accueil »</span>.
          </p>
        )}
      </div>

      {deferred && (
        <button
          onClick={install}
          className="flex-shrink-0 rounded-full px-4 py-2 text-[13px] font-bold text-white"
          style={{ background: 'var(--green)' }}
        >
          Installer
        </button>
      )}
      <button onClick={dismiss} aria-label="Fermer" className="flex-shrink-0 p-1" style={{ color: 'var(--ink-faint)' }}>
        <X size={16} />
      </button>
    </div>
  );
}
