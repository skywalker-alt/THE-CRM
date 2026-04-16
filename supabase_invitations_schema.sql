-- 1. Create Invitations Table
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  email text not null,
  role org_role not null, -- using the existing org_role enum (Owner, Admin, Sales, Qualification)
  invited_by uuid references auth.users(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default now()
);

-- Note: Because this table maps emails to organizations, anyone in the org (with Admin/Owner privileges) should be able to see who has been invited to their org.
-- Optionally, you can enable RLS on this table as well to restrict visibility.
alter table invitations enable row level security;

create policy "Users can view invitations for their organization"
  on invitations for select
  using ( is_org_member(organization_id) );

create policy "Admins and Owners can insert invitations"
  on invitations for insert
  with check ( 
    is_org_member(organization_id) 
    and exists (
      select 1 from organization_members 
      where organization_id = invitations.organization_id 
      and user_id = auth.uid() 
      and role in ('Owner', 'Admin')
    )
  );

create policy "Admins and Owners can update invitations"
  on invitations for update
  using ( 
    is_org_member(organization_id) 
    and exists (
      select 1 from organization_members 
      where organization_id = invitations.organization_id 
      and user_id = auth.uid() 
      and role in ('Owner', 'Admin')
    )
  );
