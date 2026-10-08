import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Subscription não enviada' });
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
    console.error(error);

    return res.status(500).json({
      error: 'Não foi possível enviar a notificação',
    });
  }
}