
import webpush from 'web-push';
import { supabase } from './lib/supabase.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    return res.status(500).json({
      error: 'Configuração de notificações incompleta',
    });
  }

  try {
    const { subscription } = req.body ?? {};

    if (!subscription?.endpoint) {
      return res.status(400).json({
        error: 'Inscrição inválida ou não enviada',
      });
    }

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          subscription,
        },
        { onConflict: 'endpoint' }
      );

    if (dbError) {
      console.error('Erro ao salvar inscrição:', dbError);
      return res.status(500).json({
        error: 'Não foi possível salvar a inscrição',
      });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

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
    return res.status(500).json({
      error: 'Falha no envio da notificação push',
    });
  }
}
