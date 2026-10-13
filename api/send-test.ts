
import webpush from 'web-push';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    console.error('Configuração VAPID incompleta', {
      subject: Boolean(subject),
      publicKey: Boolean(publicKey),
      privateKey: Boolean(privateKey),
    });
    return res.status(500).json({ error: 'Configuração de notificações incompleta' });
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const { subscription } = req.body ?? {};

    if (!subscription) {
      return res.status(400).json({ error: 'Inscrição não enviada' });
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'AZYRUS',
        body: 'As notificações push estão funcionando.',
        url: '/',
      })
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no envio push:', error);
    return res.status(500).json({ error: 'Falha ao enviar notificação push' });
  }
}
