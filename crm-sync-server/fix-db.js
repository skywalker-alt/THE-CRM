const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const userId = '11111111-1111-1111-1111-111111111111';
  let { data: member } = await supabase.from('organization_members').select('*').eq('user_id', userId).single();
  let orgId;
  
  if (!member) {
      console.log('Creating organization for mock user...');
      const { data: org } = await supabase.from('organizations').insert([{ name: 'Mock User Organization' }]).select().single();
      orgId = org.id;
      await supabase.from('organization_members').insert({ organization_id: orgId, user_id: userId, role: 'Owner' });
  } else {
      console.log('Mock user already has organization:', member.organization_id);
      orgId = member.organization_id;
  }
  
  console.log(`Updating orphaned leads to orgId: ${orgId}`);
  const { data, error } = await supabase.from('leads').update({ organization_id: orgId }).is('organization_id', null);
  
  if(error) {
      console.error('Error fixing leads:', error);
  } else {
      console.log('Successfully fixed orphaned leads! They should now appear in the UI.');
  }

  // Also fix lead_activity and tasks if any
  await supabase.from('lead_activity').update({ organization_id: orgId }).is('organization_id', null);
  await supabase.from('tasks').update({ organization_id: orgId }).is('organization_id', null);
  
  console.log('Done.');
}

fix();
