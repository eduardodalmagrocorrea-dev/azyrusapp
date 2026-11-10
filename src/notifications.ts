
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(char => char.charCodeAt(0))
  );
}

export async function subscribeToPush() {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    throw new Error('Este navegador não oferece suporte a notificações push.');
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();

  if (!publicKey) {
    throw new Error(
      'VITE_VAPID_PUBLIC_KEY está vazia no build. Verifique o .env.local e recompile.'
    );
  }

  const permission = await Notification.requestPermission();

if (permission !== 'granted') {
  throw new Error(
    `Permissão de notificação: ${permission}.`
  );
}

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const response = await fetch('/api/send-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscription }),
  });

  if (!response.ok) {
    throw new Error('Não foi possível registrar a inscrição no servidor.');
  }

  return true;
}
