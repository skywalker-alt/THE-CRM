const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRls() {
  const sql = `
create or replace function is_org_member(_org_id uuid)
returns boolean
language sql security definer
as $$
  -- BYPASS FOR LOCAL DEVELOPMENT WITH MOCK USERS
  -- If auth.uid() is null, allow access.
  select auth.uid() is null or exists (
    select 1 from organization_members
    where organization_id = _org_id
    and user_id = auth.uid()
  );
$$;
  `;

  // We can't run raw SQL directly through the JS client easily without an RPC. 
  // Let's create an RPC function on Supabase, or just use the REST API to execute it.
  // Actually, Supabase JS client doesn't support raw SQL execution directly.
  console.log("To fix this, you need to run this SQL in your Supabase SQL Editor:");
  console.log(sql);
}

fixRls();
