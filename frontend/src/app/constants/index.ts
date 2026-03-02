// Constants for the Adaptive SAT application

export const ROUTES = {
  SETUP: '/setup',
  DASHBOARD: '/',
  PRACTICE: '/practice',
  PRACTICE_SESSION: '/practice/session/:sessionId',
  EXAM: '/exam',
  EXAM_SESSION: '/exam/session/:sessionId',
  PROGRESS: '/progress',
  ADMIN: '/admin',
} as const;

export const SECTIONS = {
  MATH: 'MATH',
  RW: 'RW',
} as const;

export const SECTION_LABELS = {
  MATH: 'Math',
  RW: 'Reading & Writing',
} as const;

export const MASTERY_LEVELS = {
  LOW: { min: 0, max: 40, label: 'Developing', color: 'from-red-400 to-orange-400' },
  MID: { min: 40, max: 70, label: 'Progressing', color: 'from-yellow-400 to-amber-400' },
  HIGH: { min: 70, max: 100, label: 'Mastered', color: 'from-green-400 to-emerald-400' },
} as const;

// API base URL is resolved in api/client.ts via getBase() (VITE_API_URL or auto-detect 8000/8001).
