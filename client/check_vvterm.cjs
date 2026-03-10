const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://vzfmlcvbquywhanilbug.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6Zm1sY3ZicXV5d2hhbmlsYnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjA3NjMsImV4cCI6MjA4ODYzNjc2M30.fWd0dYnkyVfNfAndpwVB07dcMRktacHT5NutxdjvfbU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Querying for VVTerm...");
    const { data, error } = await supabase.from('apps').select('name, release_date, first_seen').ilike('name', '%VVTerm%');
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}
main();
