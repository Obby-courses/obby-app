# Obby — Documentazione Funzionale e Tecnica 🚀

Obby è un'applicazione mobile innovativa progettata per trasformare qualsiasi desiderio di apprendimento in un percorso strutturato, visivo e guidato dall'Intelligenza Artificiale. Questa documentazione descrive in dettaglio l'architettura, il flusso dei dati e il funzionamento interno dell'app.

---

## 1. Visione del Prodotto
L'obiettivo di Obby è democratizzare l'apprendimento strutturato. Invece di navigare tra migliaia di tutorial sparsi, l'utente riceve un **percorso coerente** che va dal "zero assoluto" alla "padronanza totale", arricchito da sfide pratiche (milestone) e risorse multimediali filtrate.

---

## 2. Architettura Tecnica

### Frontend
- **Framework**: [Expo](https://expo.dev/) (React Native) con SDK 51+.
- **Routing**: [Expo Router](https://docs.expo.dev/router/) (File-based navigation).
- **Stile**: Design System Premium "Light-Only" basato su una palette vibrante, tipografia audace e animazioni fluide con `react-native-reanimated`.
- **Mappe**: Visualizzazione interattiva dei percorsi tramite componenti SVG dinamici.

### Backend & AI
- **Database & Auth**: [Supabase](https://supabase.com/).
- **AI Engine**: [Groq](https://groq.com/) (LLM: Llama-3.3-70b-versatile) invocato tramite Supabase Edge Functions.
- **Ricerca Risorse**: Integrazione con YouTube API e Web Search per trovare i migliori contenuti educativi.

---

## 3. Modello dei Dati (Entità)

Il sistema segue una gerarchia rigorosa per garantire la progressione dell'apprendimento:

1.  **Course (Corso)**: L'entità radice (es. "Imparare il Pianoforte").
2.  **Macro-Phase (Macro-fase)**: Esattamente 6 stadi fissi che definiscono il viaggio (es. Fondamenta Assolute, Prime Applicazioni, Mastery).
3.  **Phase (Fase)**: Sotto-unità di una macro-fase (solitamente 4 per macro-fase) focalizzate su un outcome specifico.
4.  **Step (Passaggio)**: La singola lezione operativa (es. "Come posizionare le dita sul Do"). Ogni step è collegato a una risorsa (video o web).
5.  **Milestone (Traguardo)**: Una sfida pratica alla fine di ogni fase per validare le competenze acquisite.
6.  **Resource (Risorsa)**: Metadati su video YouTube o pagine web selezionati dall'AI.

---

## 4. Flusso di Generazione AI (AI Course Builder)

La creazione di un corso è un processo multi-stadio gestito da Supabase Edge Functions e definiti in `prompts.ts`:

### Fase A: Lo Scheletro (generate-skeleton)
L'AI progetta l'intera struttura del corso (6 Macro-fasi + ~24 Fasi) in un unico passaggio, definendo i titoli, le descrizioni e gli intenti delle milestone.

### Fase B: Valutazione delle Competenze (Skill Assessment)
Invece di partire sempre dall'inizio, l'app genera un quiz dinamico. In base alle risposte, l'AI determina da quale macro-fase l'utente dovrebbe iniziare, "abbuonando" quelle già padroneggiate.

### Fase C: Decostruzione in Step (create-steps)
Per la fase corrente dell'utente, l'AI:
1.  Identifica i concetti tecnici necessari.
2.  Cerca su YouTube/Web risorse pertinenti.
3.  Crea step operativi basati su ciò che la risorsa insegna realmente.

### Fase D: Milestone Taylor-made (create-milestone)
L'AI genera una sfida finale basata *esclusivamente* su quanto insegnato negli step della fase appena completata, garantendo un incremento di difficoltà realistico (+10-20%).

---

## 5. Modalità di Generazione

1.  **Iterativa (Standard)**: L'app genera lo scheletro e solo il contenuto della prima fase necessaria. Il resto viene generato "just-in-time" mentre l'utente avanza. Questo garantisce velocità di risposta e adattabilità.
2.  **Bulk Dev Mode (Sviluppo)**: Una modalità speciale che genera l'intero corso (tutti i ~100 step e risorse) in un'unica sessione di pochi minuti. Usata per test di coerenza del curriculum.

---

## 6. Caratteristiche UX Chiave

- **Immersive Course Map**: Ogni corso ha un'identità cromatica unica. La mappa cambia colore e stile in base al tema del corso.
- **Smart Learning Pace**: L'utente può scegliere quanti step completare a settimana (Pace rilassato vs Intensivo). L'app calcola le scadenze e le visualizza in uno **Smart Calendar**.
- **Progress Tracking**: Barre di caricamento e stati visivi chiari (`pending`, `completed`, `skipped`) mappano il progresso lungo la "strada" del corso.

---

## 7. Struttura del Codice Principale

- `/app`: Schermi e routing (il cuore della navigazione).
- `/supabase/functions`: Logica AI e manipolazione dati server-side.
- `/supabase/functions/prompts.ts`: La "mente" dell'app; contiene i complessi prompt che guidano il comportamento dell'AI.
- `/components`: Elementi UI riutilizzabili (StepItem, MilestoneItem, CourseCard).
- `/lib`: Configurazioni (Supabase, Temi, Utility).

---

## 8. Sviluppi Futuri
- Gamification avanzata (Badge, Streak).
- Modalità Offline per i contenuti testuali.
- Generazione di Quiz intermedi tra gli step.
- Supporto per percorsi multi-utente e social learning.
