import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note, NoteBlock } from '@/types';

const NOTES_KEY = 'tchope_notes';

type NotesContextType = {
  notes: Note[];
  addNote: (note: Note) => void;
  updateNote: (id: string, note: Note) => void;
  deleteNote: (id: string) => void;
  getNote: (id: string) => Note | undefined;
  clearAll: () => void;
};

const NotesContext = createContext<NotesContextType>({
  notes: [],
  addNote: () => {},
  updateNote: () => {},
  deleteNote: () => {},
  getNote: () => undefined,
  clearAll: () => {},
});

export function createEmptyBlock(type: NoteBlock['type'] = 'paragraph'): NoteBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    content: '',
    ...(type === 'checklist' ? { checked: false } : {}),
  };
}

export function createEmptyNote(): Note {
  const now = new Date().toISOString();
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    blocks: [createEmptyBlock('paragraph')],
    createdAt: now,
    updatedAt: now,
  };
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY).then((raw) => {
      if (raw) {
        try { setNotes(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = (next: Note[]) => {
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
  };

  const addNote = useCallback((note: Note) => {
    setNotes((prev) => {
      const next = [note, ...prev];
      persist(next);
      return next;
    });
  }, []);

  const updateNote = useCallback((id: string, note: Note) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...note, updatedAt: new Date().toISOString() } : n));
      persist(next);
      return next;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const getNote = useCallback((id: string) => notes.find((n) => n.id === id), [notes]);

  const clearAll = useCallback(() => {
    setNotes([]);
    AsyncStorage.removeItem(NOTES_KEY);
  }, []);

  return (
    <NotesContext.Provider value={{ notes, addNote, updateNote, deleteNote, getNote, clearAll }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  return useContext(NotesContext);
}
