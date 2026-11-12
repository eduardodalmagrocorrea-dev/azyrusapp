
import webpush from 'web-push';
import { supabase } from './lib/supabase.js';

function getLocalTime(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find(part => part.type === type)?.value ?? '';

  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    day: weekdays[get('weekday')],
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido',
    });
  }

  const secret = process.env.CRON_SECRET;

  if (
    !secret ||
    req.headers.authorization !== `Bearer ${secret}`
  ) {
    return res.status(401).json({
      error: 'Não autorizado',
    });
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    console.error('Configuração VAPID incompleta');

    return res.status(500).json({
      error: 'Configuração VAPID incompleta',
    });
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const { data: reminders, error } = await supabase
      .from('habit_reminders')
      .select('*')
      .eq('enabled', true);

    if (error) {
      console.error('Erro ao buscar lembretes:', error);

      return res.status(500).json({
        error: 'Não foi possível buscar os lembretes.',
      });
    }

    let sent = 0;

    for (const reminder of reminders ?? []) {
      try {
        const local = getLocalTime(reminder.timezone);

        const [hour, minute] = local.time.split(':').map(Number);

        const [targetHour, targetMinute] = reminder.reminder_time
          .slice(0, 5)
          .split(':')
          .map(Number);

        const currentMinutes = hour * 60 + minute;
        const targetMinutes = targetHour * 60 + targetMinute;
        const difference = currentMinutes - targetMinutes;

        if (
          !reminder.days.includes(local.day) ||
          difference < 0 ||
          difference > 2 ||
          reminder.last_sent_date === local.date
        ) {
          continue;
        }

        // Reserva o envio para evitar duplicações.
        const { data: claimed, error: claimError } = await supabase
          .from('habit_reminders')
          .update({
            last_sent_date: local.date,
          })
          .eq('endpoint', reminder.endpoint)
          .eq('habit_id', reminder.habit_id)
          .eq('enabled', true)
          .or(
            `last_sent_date.is.null,last_sent_date.neq.${local.date}`
          )
          .select('habit_id')
          .maybeSingle();

        if (claimError) {
          console.error('Erro ao reservar lembrete:', claimError);
          continue;
        }

        if (!claimed) continue;

        const { data: registered, error: subscriptionError } =
          await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('endpoint', reminder.endpoint)
            .maybeSingle();

        if (subscriptionError || !registered?.subscription) {
          console.error(
            'Inscrição não encontrada:',
            subscriptionError
          );

          await supabase
            .from('habit_reminders')
            .update({ enabled: false })
            .eq('endpoint', reminder.endpoint);

          continue;
        }

        await webpush.sendNotification(
          registered.subscription,
          JSON.stringify({
            title: 'AZYRUS',
            body: `Hora de: ${reminder.habit_name}`,
            url: '/',
          })
        );

        sent++;
      } catch (error: any) {
        console.error(
          'Erro ao enviar lembrete:',
          reminder.habit_name,
          error
        );

        // Permite nova tentativa caso o envio falhe.
        await supabase
          .from('habit_reminders')
          .update({ last_sent_date: null })
          .eq('endpoint', reminder.endpoint)
          .eq('habit_id', reminder.habit_id)
          .eq(
            'last_sent_date',
            getLocalTime(reminder.timezone).date
          );

        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', reminder.endpoint);

          await supabase
            .from('habit_reminders')
            .update({ enabled: false })
            .eq('endpoint', reminder.endpoint);
        }
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      checked: reminders?.length ?? 0,
    });
  } catch (error) {
    console.error('Erro geral nos lembretes:', error);

    return res.status(500).json({
      error: 'Falha ao processar os lembretes.',
    });
  }
}
