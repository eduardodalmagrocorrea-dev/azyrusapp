
import { supabase } from './lib/supabase.js';
import { sameOrigin, session } from './lib/security.js';
import { parseReminderSchedule } from './lib/reminder-schedule.js';

export default async function handler(
req: any,
res: any
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!sameOrigin(req) || !session(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { subscription, reminders, timezone } = req.body ?? {};
    const endpoint = subscription?.endpoint;

    if (!endpoint || !Array.isArray(reminders)) {
      return res.status(400).json({
        error: 'Dados de sincronização inválidos',
      });
    }
    let schedules;
    try {
      schedules = parseReminderSchedule(reminders);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Lembretes inválidos.' });
    }

    const { data: registered, error: lookupError } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!registered) {
      return res.status(404).json({
        error: 'Inscrição push não encontrada',
      });
    }

    const { data: active, error: activeError } = await supabase
      .from('habit_reminders')
      .select('habit_id')
      .eq('endpoint', endpoint)
      .eq('enabled', true);
    if (activeError) throw activeError;

    if (schedules.length > 0) {
      const rows = schedules.map(reminder => ({
        endpoint,
        habit_id: reminder.id,
        habit_name: reminder.habitName,
        reminder_time: reminder.time,
        days: reminder.days,
        timezone: timezone || 'America/Sao_Paulo',
        enabled: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('habit_reminders')
        .upsert(rows, {
          onConflict: 'endpoint,habit_id',
        });

      if (upsertError) throw upsertError;
    }
    const currentIds = new Set(schedules.map(reminder => reminder.id));
    const obsolete = (active ?? []).map(row => row.habit_id).filter(id => !currentIds.has(id));
    if (obsolete.length) {
      const { error: disableError } = await supabase.from('habit_reminders')
        .update({ enabled: false }).eq('endpoint', endpoint).in('habit_id', obsolete);
      if (disableError) throw disableError;
    }

    return res.status(200).json({
      success: true,
      synced: reminders.length,
    });
  } catch (error) {
    console.error('Erro ao sincronizar lembretes:', error);

    return res.status(500).json({
      error: 'Erro ao sincronizar lembretes',
    });
  }
}
