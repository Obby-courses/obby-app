export type LoadingStatus = 
  | 'CREATING_COURSE'
  | 'GENERATING_PHASES'
  | 'GENERATING_STEPS'
  | 'GENERATING_MILESTONE'
  | 'GENERATING_ASSESSMENT'
  | 'SUCCESS_PHASE'

type LoadingMessage = {
  icon: any
  title: string
  subtitle?: string
}

export const loadingMessages: Record<LoadingStatus, LoadingMessage> = {
  CREATING_COURSE: {
    icon: 'checkmark-circle-outline',
    title: 'Creazione Corso',
    subtitle: 'Stiamo generando la struttura del corso',
  },
  GENERATING_PHASES: {
    icon: 'layers-outline',
    title: 'Generazione Fasi',
    subtitle: 'Stiamo suddividendo in fasi di apprendimento',
  },
  GENERATING_STEPS: {
    icon: 'list-outline',
    title: 'Creazione Step',
    subtitle: 'Stiamo generando gli step operativi',
  },
  GENERATING_MILESTONE: {
    icon: 'trophy-outline',
    title: 'Sfida Finale',
    subtitle: 'Stiamo preparando la tua prova di competenza',
  },
  GENERATING_ASSESSMENT: {
    icon: 'help-circle-outline',
    title: 'Analisi Competenze',
    subtitle: 'Stiamo preparando alcune domande per te',
  },
  SUCCESS_PHASE: {
    icon: 'star-outline',
    title: 'Fase Completata!',
    subtitle: 'Ottimo lavoro, hai sbloccato un nuovo traguardo',
  },
}