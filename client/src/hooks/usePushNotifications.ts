import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/api';

export type PushStatus = 'unsupported' | 'loading' | 'denied' | 'subscribed' | 'unsubscribed';

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

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    // Vérifie si déjà abonné
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? 'subscribed' : 'unsubscribed');
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!isAuthenticated) return;
    setStatus('loading');
    try {
      // Enregistre le service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Récupère la clé VAPID publique
      const { data } = await userApi.get('/public/user/push/vapid-key');
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

      // Demande la permission et crée la subscription
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Envoie au serveur
      await userApi.post('/public/user/push/subscribe', { subscription });
      setStatus('subscribed');
    } catch (err) {
      if (Notification.permission === 'denied') {
        setStatus('denied');
      } else {
        setStatus('unsubscribed');
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

  return { status, subscribe, unsubscribe };
}
