# Obby 🚀
### Impara qualsiasi cosa, un passo alla volta.

**Obby** è la tua piattaforma di apprendimento personalizzata che trasforma obiettivi complessi in percorsi chiari, visivi e coinvolgenti. Grazie all'intelligenza artificiale, puoi generare corsi su misura per qualsiasi argomento e seguirli attraverso una mappa interattiva ed immersiva.

---

## ✨ Caratteristiche Principali (v1.1.0)

- **🤖 AI Course Builder**: Descrivi cosa vuoi imparare e lascia che l'AI generi un percorso completo diviso in fasi, step e milestone.
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
- **Gestures**: [React Native Gesture Handler](https://software-mansion.github.io/react-native-gesture-handler/)
- **Animazioni**: [React Native Reanimated](https://software-mansion.github.io/react-native-reanimated/)
- **SVA Components**: [React Native SVG](https://github.com/software-mansion/react-native-svg)

---

## 🚀 Come Iniziare

1. **Clona il repository**
   ```bash
   git clone https://github.com/tuo-username/obby-app.git
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

## 📋 Changelog v1.1.0

- **New Theme**: Introduzione completa del tema Premium Light-Only.
- **Visual Improvements**: Card dei corsi espanse con descrizioni e barre di progresso.
- **Calendar Update**: Calendario settimanale/mensile integrato direttamente nella Home con pallini colorati dinamici.
- **Immersive Maps**: Sfondo della mappa del corso adattivo basato sul colore del percorso.
- **UX Fixes**: Eliminazione del "salto" visivo all'apertura delle mappe e rimozione di elementi di navigazione ridondanti.
- **Cleanup**: Rimozione completa del supporto alla modalità scura per una coerenza visiva assoluta.

---

## 🤝 Contribuire

Le contribuzioni sono benvenute! Senti libero di aprire Issue o Pull Request per migliorare Obby.

---

## 📄 Licenza

Distribuito sotto Licenza MIT. Vedi `LICENSE` per maggiori informazioni.

---

Creato con ❤️ per chi non smette mai di imparare.
