
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    console.log("Checking Courses...");
    const { data: courses, error: cErr } = await supabase.from('courses').select('id, user_id, title');
    if (cErr) console.error(cErr);
    else console.log(`Found ${courses.length} courses. ${courses.filter(c => !c.user_id).length} without user_id.`);

    console.log("Checking Steps...");
    const { data: steps, error: sErr } = await supabase.from('steps').select('id, course_id, phase_id, title').limit(10);
    if (sErr) console.error(sErr);
    else {
        console.log(`Checking first 10 steps (total ${steps.length} if limited)...`);
        steps.forEach(s => {
            console.log(`Step: ${s.title}, CourseID: ${s.course_id}, PhaseID: ${s.phase_id}`);
        });
    }

    console.log("Checking Phases...");
    const { data: phases, error: pErr } = await supabase.from('phases').select('id, course_id, macro_phase_id').limit(5);
    if (pErr) console.error(pErr);
    else phases.forEach(p => console.log(`Phase: ${p.id}, CourseID: ${p.course_id}`));
}

checkData();
