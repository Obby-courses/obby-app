const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Usa la Service Role Key se disponibile (bypassa RLS), altrimenti ripiega sulla Anon Key
const keyToUse = serviceKey || anonKey;

if (!url || !keyToUse) {
    console.error("❌ Errore: Variabili d'ambiente Supabase non trovate in .env");
    process.exit(1);
}

const supabase = createClient(url, keyToUse);


async function listAvailableCourses() {
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title')
        .limit(10);

    if (error) {
        console.error("❌ Errore nel recupero della lista corsi:", error.message);
        return;
    }

    if (!courses || courses.length === 0) {
        console.log("⚠️ Nessun corso trovato nel database.");
    } else {
        console.log("\nCorsi disponibili nel database:");
        courses.forEach(c => {
            console.log(`- ID: ${c.id} | Titolo: ${c.title}`);
        });
    }
}

async function exportCourse(courseId) {
    console.log(`\n🔍 Ricerca corso: ${courseId}...`);

    const { data: course, error: cErr } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

    if (cErr) {
        console.error("❌ Errore database:", cErr.message);
        return;
    }

    if (!course) {
        console.error("❌ Corso non trovato.");
        await listAvailableCourses();
        return;
    }

    console.log(`✅ Corso trovato: ${course.title}. Generazione Markdown...`);

    let output = `# CORSO: ${course.title}\n`;
    output += `${course.description || 'Nessuna descrizione'}\n\n`;

    // Macro Fasi
    const { data: mps } = await supabase
        .from('macro_phases')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

    if (mps) {
        for (const mp of mps) {
            output += `## MACRO FASE ${mp.order_index}: ${mp.title}\n${mp.description || ''}\n\n`;

            // Fasi
            const { data: phases } = await supabase
                .from('phases')
                .select('*')
                .eq('macro_phase_id', mp.id)
                .order('order_index');

            if (phases) {
                for (const p of phases) {
                    output += `### FASE ${p.order_index}: ${p.title}\n`;

                    // Step
                    const { data: steps } = await supabase
                        .from('steps')
                        .select('*')
                        .eq('phase_id', p.id)
                        .order('order_index');

                    if (steps && steps.length > 0) {
                        output += `#### Checklist Progressiva:\n`;
                        steps.forEach(s => {
                            output += `- [ ] **${s.title}**\n  *Descrizione:* ${s.description || '...'}\n`;
                        });
                    }

                    // Milestone
                    const { data: milestone } = await supabase
                        .from('milestones')
                        .select('*')
                        .eq('phase_id', p.id)
                        .maybeSingle();

                    if (milestone) {
                        output += `\n#### 🏁 Milestone Finale di Fase: ${milestone.title}\n${milestone.description}\n`;
                    }
                    output += `\n---\n\n`;
                }
            }
        }
    }

    const path = require('path');
    const exportDir = path.join(__dirname, '..', 'export_corsi');

    // Assicurati che la cartella esista
    const fs = require('fs');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `export_corso_${course.id}.md`;
    const fullPath = path.join(exportDir, fileName);
    fs.writeFileSync(fullPath, output);

    console.log(`\n🎉 Esportazione completata!`);
    console.log(`📄 File creato: ${fullPath}`);
}


async function exportAllCourses() {
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title');

    if (error) {
        console.error("❌ Errore nel recupero della lista corsi:", error.message);
        return;
    }

    if (!courses || courses.length === 0) {
        console.log("⚠️ Nessun corso trovato nel database.");
        return;
    }

    console.log(`📂 Trovati ${courses.length} corsi. Inizio esportazione...`);
    for (const c of courses) {
        await exportCourse(c.id);
    }
    console.log(`\n✅ Operazione completata: ${courses.length} corsi esportati in /export_corsi`);
}

const courseId = process.argv[2];
if (!courseId) {
    exportAllCourses();
} else {
    exportCourse(courseId);
}
