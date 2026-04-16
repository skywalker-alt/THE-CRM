const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: org_members, error: org_membersError } = await supabase.from('organization_members').select('*');
  console.log('Org Members:', org_members);
  if(org_membersError) console.error('org err', org_membersError);

  const { data: leads, error: leadsError } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Last 5 Leads org id:', leads ? leads.map(l => ({ id: l.id, org_id: l.organization_id, name: l.full_name })) : null);
  if(leadsError) console.error('lead err', leadsError);

  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
  console.log('Orgs:', orgs);
}

checkDb();
