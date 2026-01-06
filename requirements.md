# Obby — Requirements (MVP tecnico)

## 1. Visione
Obby è un’app mobile per corsi amatoriali e percorsi di apprendimento strutturati in step.
L’obiettivo è permettere all’utente di seguire un percorso chiaro, step-by-step, in modo semplice e motivante.

In questa fase Obby è focalizzata sulla chiarezza del flusso e sulla struttura dei contenuti, non sulla monetizzazione.

---

## 2. Stato attuale (verificato)
- App mobile sviluppata con Expo (React Native)
- Navigazione:
  - Home → lista corsi
  - Corso → lista step
- Backend: Supabase
- Tabelle attive:
  - courses
  - steps
- Autenticazione: NON presente
- Row Level Security: DISATTIVATA
- Tutti i corsi e gli step sono pubblicamente leggibili
- Dati reali già visualizzati sull’app

---

## 3. Entità principali

### Course
Rappresenta un corso o percorso di apprendimento.

Campi principali:
- id (uuid)
- title (string)
- description (string, generata da IA)
- created_at (timestamp)

Un corso contiene più step.

---

### Step
Rappresenta un’unità di apprendimento all’interno di un corso.

Campi principali:
- id (uuid)
- course_id (uuid, relazione con Course)
- title (string)
- description (string)
- order_index (number)
- completed (boolean, previsto ma non ancora usato)

---

## 4. Flusso utente attuale (reale)

1. L’utente apre l’app
2. Vede una lista di corsi disponibili
3. Tocca un corso
4. Vede la lista degli step del corso

Non esistono login, profili o limitazioni.

---

## 5. Cose volutamente escluse (per ora)

- Login / autenticazione
- Paywall / abbonamenti
- Ruoli utente
- Creazione corsi da app
- Modifica
