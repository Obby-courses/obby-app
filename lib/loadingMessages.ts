export type LoadingStatus = 
  | 'CREATING_COURSE'
  | 'GENERATING_PHASES'
  | 'GENERATING_STEPS'
  | 'GENERATING_MILESTONE'
  | 'GENERATING_ASSESSMENT'
  | 'SUCCESS_PHASE'

type LoadingMessage = {
  emoji: string
  title: string
  subtitle?: string
}

export const loadingMessages: Record<LoadingStatus, LoadingMessage> = {
  CREATING_COURSE: {
    emoji: '🎯',
    title: 'Creazione Corso',
    subtitle: 'Stiamo generando la struttura del corso',
  },
  GENERATING_PHASES: {
    emoji: '📊',
    title: 'Generazione Fasi',
    subtitle: 'Stiamo suddividendo in fasi di apprendimento',
  },
  GENERATING_STEPS: {
    emoji: '✏️',
    title: 'Creazione Step',
    subtitle: 'Stiamo generando gli step operativi',
  },
  GENERATING_MILESTONE: {
    emoji: '🏆',
    title: 'Sfida Finale',
    subtitle: 'Stiamo preparando la tua prova di competenza',
  },
  GENERATING_ASSESSMENT: {
    emoji: '🧠',
    title: 'Analisi Competenze',
    subtitle: 'Stiamo preparando alcune domande per te',
  },
  SUCCESS_PHASE: {
    emoji: '⭐',
    title: 'Fase Completata!',
    subtitle: 'Ottimo lavoro, hai sbloccato un nuovo traguardo',
  },
}