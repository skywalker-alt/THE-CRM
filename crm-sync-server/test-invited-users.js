const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
      console.error('Error fetching users:', usersError);
  } else {
      console.log('Real Auth Users:', users.users.map(u => ({ id: u.id, email: u.email })));
  }

  const { data: orgMembers, error: orgMembersError } = await supabase.from('organization_members').select('*');
  console.log('\nOrganization Members Table:', orgMembers);
}

checkDb();
