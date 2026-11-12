
import { supabase } from './lib/supabase.js';

export default async function handler(
req: any,
res: any
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { subscription, reminders, timezone } = req.body ?? {};
    const endpoint = subscription?.endpoint;

    if (!endpoint || !Array.isArray(reminders)) {
      return res.status(400).json({
        error: 'Dados de sincronização inválidos',
      });
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

    const { error: disableError } = await supabase
      .from('habit_reminders')
      .update({ enabled: false })
      .eq('endpoint', endpoint);

    if (disableError) throw disableError;

    if (reminders.length > 0) {
      const rows = reminders.map((reminder: any) => ({
        endpoint,
        habit_id: reminder.habitId,
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