import { useCallback, useEffect, useRef, useState } from 'react';
import { PUBLISHED_LESSONS } from './curriculum';

export const LESSON_STORAGE_KEY = 'lld-lessons-v1';

const publishedIds = new Set(PUBLISHED_LESSONS.map(lesson => lesson.id));

function normalize(value) {
  const lessons = {};
  for (const id of publishedIds) {
    const saved = value?.lessons?.[id];
    if (!saved || typeof saved !== 'object') continue;
    lessons[id] = {
      reviewed: saved.reviewed === true,
      bookmarked: saved.bookmarked === true,
      notes: typeof saved.notes === 'string' ? saved.notes.slice(0, 2000) : '',
    };
  }
  return { lessons, lastLessonId: publishedIds.has(value?.lastLessonId) ? value.lastLessonId : null };
}

function read() {
  try {
    return { progress: normalize(JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY))), notice: '' };
  } catch {
    return { progress: normalize(null), notice: 'Saved lesson progress could not be read. You can keep learning in this session.' };
  }
}

export function useLessonProgress() {
  const [initial] = useState(read);
  const [progress, setProgress] = useState(initial.progress);
  const [notice, setNotice] = useState(initial.notice);
  const current = useRef(initial.progress);

  const commit = useCallback(next => {
    current.current = next;
    setProgress(next);
    try {
      localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(next));
      setNotice('');
    } catch {
      setNotice('Browser storage is unavailable. Changes are not saved. Keep this page open and copy any notes you want to keep before leaving.');
    }
  }, []);

  useEffect(() => {
    const sync = event => {
      if (event.key !== LESSON_STORAGE_KEY && event.key !== null) return;
      const saved = read();
      current.current = saved.progress;
      setProgress(saved.progress);
      setNotice(saved.notice);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const updateLesson = useCallback((id, changes) => {
    if (!publishedIds.has(id)) return;
    const previous = current.current;
    commit(normalize({ ...previous, lessons: { ...previous.lessons, [id]: { ...previous.lessons[id], ...changes } } }));
  }, [commit]);

  const visit = useCallback(id => {
    if (!publishedIds.has(id)) return;
    const latest = read();
    const previous = latest.notice ? current.current : latest.progress;
    commit({ ...previous, lastLessonId: id });
  }, [commit]);

  return { progress, notice, updateLesson, visit };
}
