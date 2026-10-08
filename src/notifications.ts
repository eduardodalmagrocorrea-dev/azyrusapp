export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }
  
    const permission = await Notification.requestPermission();
  
    return permission === 'granted';
  }
  
  export function showTestNotification() {
    if (!('Notification' in window)) {
      return false;
    }
  
    if (Notification.permission !== 'granted') {
      return false;
    }
  
    new Notification('AZYRUS', {
      body: 'As notificações estão funcionando.',
    });
  
    return true;
  }