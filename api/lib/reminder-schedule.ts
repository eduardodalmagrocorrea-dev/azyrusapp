const suffix = '::weekday:';

export function reminderHabitId(id: string) {
  const match = /^(.*)::weekday:[0-6]$/.exec(id);
  return match?.[1] || id;
}

export function parseReminderSchedule(input: unknown[]) {
  const entries = input.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Lembrete inválido.');
    const { habitId, habitName, time, days, scheduleDay } = item as Record<string, unknown>;
    if (typeof habitId !== 'string' || !habitId || reminderHabitId(habitId) !== habitId ||
      typeof habitName !== 'string' || typeof time !== 'string' || !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time) ||
      !Array.isArray(days) || !days.length || new Set(days).size !== days.length ||
      days.some(day => !Number.isInteger(day) || day < 0 || day > 6) ||
      (scheduleDay !== undefined && (days.length !== 1 || days[0] !== scheduleDay))) {
      throw new Error('Horário ou dias do lembrete inválidos.');
    }
    return { id: scheduleDay === undefined ? habitId : habitId + suffix + scheduleDay, habitId, habitName, time, days };
  });
  const activeDays = new Map<string, Set<number>>();
  const ids = new Set(entries.map(entry => entry.id));
  if (ids.size !== entries.length) throw new Error('Lembrete duplicado.');
  for (const entry of entries) {
    if (!ids.has(entry.habitId)) throw new Error('Falta o horário principal do hábito.');
    const seen = activeDays.get(entry.habitId) ?? new Set<number>();
    for (const day of entry.days) {
      if (seen.has(day)) throw new Error('Mais de um horário para o mesmo dia.');
      seen.add(day);
    }
    activeDays.set(entry.habitId, seen);
  }
  return entries;
}
