const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.error("❌ Errore: Variabili d'ambiente non trovate.");
    process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function fixPublishedStatus() {
    console.log("🛠️  Aggiornamento is_published per tutti i corsi...");

    const { data, error } = await supabase
        .from('courses')
        .update({ is_published: true })
        .is('is_published', null);

    const { data: data2, error: error2 } = await supabase
        .from('courses')
        .update({ is_published: true })
        .eq('is_published', false);

    if (error || error2) {
        console.error("❌ Errore durante l'aggiornamento:", error || error2);
    } else {
        console.log("✅ Tutti i corsi esistenti sono stati pubblicati con successo.");
    }
}

fixPublishedStatus();
