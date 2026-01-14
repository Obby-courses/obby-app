export type LoadingStatus = 
  | 'CREATING_COURSE'
  | 'GENERATING_PHASES'
  | 'GENERATING_STEPS'

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
}