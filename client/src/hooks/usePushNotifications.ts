import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/api';

export type PushStatus = 'unsupported' | 'loading' | 'denied' | 'subscribed' | 'unsubscribed' | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return view;
}

export function usePushNotifications(isAuthenticated: boolean) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    // Timeout de sécurité si le SW ne répond pas
    const timer = setTimeout(() => setStatus('unsubscribed'), 5000);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setStatus('unsubscribed'))
      .finally(() => clearTimeout(timer));
  }, []);

  const subscribe = useCallback(async () => {
    if (!isAuthenticated) return;
    setStatus('loading');
    setErrorMsg(null);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let vapidKey: string;
      try {
        const { data } = await userApi.get('/public/user/push/vapid-key');
        vapidKey = data.publicKey;
      } catch {
        setStatus('error');
        setErrorMsg('Service de notifications non configuré.');
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await userApi.post('/public/user/push/subscribe', { subscription });
      setStatus('subscribed');
    } catch (err) {
      if (Notification.permission === 'denied') {
        setStatus('denied');
        setErrorMsg('Notifications bloquées. Autorisez-les dans vos réglages.');
      } else {
        setStatus('error');
        setErrorMsg('Impossible d\'activer les notifications.');
      }
      console.error('Push subscribe error:', err);
    }
  }, [isAuthenticated]);

  const unsubscribe = useCallback(async () => {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await userApi.delete('/public/user/push/subscribe');
      setStatus('unsubscribed');
    } catch {
      setStatus('subscribed');
    }
  }, []);

  // Auto-efface l'erreur après 4s
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  return { status, errorMsg, subscribe, unsubscribe };
}
