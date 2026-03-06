# Obby 🚀
### Impara qualsiasi cosa, un passo alla volta.

**Obby** è la tua piattaforma di apprendimento personalizzata che trasforma obiettivi complessi in percorsi chiari, visivi e coinvolgenti. Grazie all'intelligenza artificiale, puoi generare corsi su misura per qualsiasi argomento e seguirli attraverso una mappa interattiva ed immersiva.

> [!TIP]
> Per una panoramica approfondita del funzionamento tecnico e funzionale dell'app, consulta la [Documentazione Funzionale](./DOCUMENTAZIONE_FUNZIONALE.md).

---

## ✨ Caratteristiche Principali (v1.2.0)

- **🤖 AI Course Builder v2**: Descrivi cosa vuoi imparare e lascia che l'AI generi un percorso completo diviso in fasi, step e milestone. Ora con visione completa del percorso fin dal primo secondo.
- **🎨 Design System Premium**: Un'interfaccia moderna "light-only" curata nei minimi dettagli, con una palette colori vibrante e tipografia audace.
- **🗺️ Mappe Immersive**: Ogni corso ha la sua identità cromatica. Esplora il tuo percorso attraverso una mappa interattiva che si adatta dinamicamente allo stile del corso.
- **📅 Smart Calendar**: Visualizza le tue scadenze con un calendario integrato che evidenzia le attività future con i colori corrispondenti ai tuoi corsi.
- **📊 Tracking del Progresso**: Monitora il tuo avanzamento con barre di caricamento dinamiche e indicatori di stato chiari per ogni step.
- **🔐 Cloud Sync**: I tuoi percorsi sono sempre con te grazie all'integrazione robusta con Supabase.

---

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Deployment**: [EAS (Expo Application Services)](https://expo.dev/eas)
- **AI Engine**: [Groq](https://groq.com/) (Llama 3.3 70B)

---

## 🚀 Come Iniziare

1. **Clona il repository**
   ```bash
   git clone https://github.com/Obby-courses/obby-app.git
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura Supabase**
   Crea un file `.env` nella root del progetto con le tue credenziali:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tua_url_supabase
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tua_key_anonima
   ```

4. **Avvia l'app**
   ```bash
   npx expo start
   ```

---

## 📋 Changelog v1.2.0

- **Architettura Stabile**: Disabilitata la New Architecture per massima compatibilità con Expo Go e librerie native.
- **Fix "White Screen"**: Implementati guardie di caricamento e timeout (8s) nel caricamento della sessione Auth per evitare schermi bianchi infiniti.
- **Full Path AI Generation**: Lo `skeleton` ora salva **integralmente** tutte le macro-fasi, fasi e milestone intent nel database all'avvio del corso.
- **AI Context Awareness**: L'AI che genera gli step ha ora visione completa di tutto il percorso futuro grazie al pre-popolamento del DB.
- **Better Onboarding**: Ottimizzato il flusso JIT di creazione dei contenuti per una partenza rapida ed efficace.
- **Real-time Debugging**: Integrati log dettagliati lato server (Supabase Edge Functions) per il monitoraggio della generazione AI.

---

## 🤝 Contribuire

Le contribuzioni sono benvenute! Senti libero di aprire Issue o Pull Request per migliorare Obby.

---

## 📄 Licenza

Distribuito sotto Licenza MIT. Vedi `LICENSE` per maggiori informazioni.

---

Creato con ❤️ per chi non smette mai di imparare.
