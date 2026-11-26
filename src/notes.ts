import type { Note } from './types';

export function loadPreviousNotes(): Note[] {
  const raw = localStorage.getItem('azyrus-notes-v1');
  const notes: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(notes) || notes.some(note =>
    !note || ['id', 'title', 'content', 'createdAt', 'updatedAt'].some(key => typeof note[key] !== 'string')
  )) throw new Error('Não foi possível ler as notas existentes.');
  return notes;
}
