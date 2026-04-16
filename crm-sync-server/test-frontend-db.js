const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: leads, error: leadsError } = await supabase.from('leads').select('*');
  console.log('Leads visible anonymously:', leads ? leads.length : 0);
  if(leadsError) console.error('lead err', leadsError);
}

checkDb();
