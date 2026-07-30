const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = dotenv.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = dotenv.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/users?select=has_submitted&limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log("DB Response:", data);
}

check();
