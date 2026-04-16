-- 1. Organizations Table
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Trigger to update 'updated_at' on organization
create trigger update_organizations_modtime_trigger
before update on organizations
for each row execute procedure update_tokens_modtime();

-- 2. Organization Members Table
create type org_role as enum ('Owner', 'Admin', 'Sales', 'Qualification');

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role org_role not null default 'Sales',
  joined_at timestamp with time zone default now(),
  unique(organization_id, user_id)
);

-- Enable RLS on core tables
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table leads enable row level security;
alter table tasks enable row level security;
alter table lead_activity enable row level security;

-- 3. Update Existing Tables
alter table leads add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table tasks add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table lead_activity add column if not exists organization_id uuid references organizations(id) on delete cascade;

-- Note: In a production migration with existing data, we would create a default organization and assign existing records to it before making the column NOT NULL. 
-- For this fresh implementation or dev environment, we will leave it nullable initially but enforce it in app logic.

-- 4. Row Level Security Policies

-- Helper function to check if the current user is a member of the organization
create or replace function is_org_member(_org_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from organization_members
    where organization_id = _org_id
    and user_id = auth.uid()
  );
$$;

-- Allow users to view organizations they are long to
create policy "Users can view their organizations"
  on organizations for select
  using ( is_org_member(id) );

create policy "Users can view organization members for their orgs"
  on organization_members for select
  using ( is_org_member(organization_id) );

-- Data Isolation: Leads
create policy "Users can view leads in their organization"
  on leads for select
  using ( is_org_member(organization_id) );

create policy "Users can insert leads into their organization"
  on leads for insert
  with check ( is_org_member(organization_id) );

create policy "Users can update leads in their organization"
  on leads for update
  using ( is_org_member(organization_id) );

create policy "Users can delete leads in their organization"
  on leads for delete
  using ( is_org_member(organization_id) );

-- Data Isolation: Tasks
create policy "Users can view tasks in their organization"
  on tasks for select
  using ( is_org_member(organization_id) );

create policy "Users can insert tasks into their organization"
  on tasks for insert
  with check ( is_org_member(organization_id) );

create policy "Users can update tasks in their organization"
  on tasks for update
  using ( is_org_member(organization_id) );

create policy "Users can delete tasks in their organization"
  on tasks for delete
  using ( is_org_member(organization_id) );

-- Data Isolation: Lead Activity
create policy "Users can view activities in their organization"
  on lead_activity for select
  using ( is_org_member(organization_id) );

create policy "Users can insert activities into their organization"
  on lead_activity for insert
  with check ( is_org_member(organization_id) );

create policy "Users can update activities in their organization"
  on lead_activity for update
  using ( is_org_member(organization_id) );

create policy "Users can delete activities in their organization"
  on lead_activity for delete
  using ( is_org_member(organization_id) );

-- Role Based Policies (Example implementation for Sales vs Qualification)
-- Note: Supabase RLS policies are additive. Complex role-based access for column-level mutability is typically handled via application logic or database functions (BEFORE triggers).
-- We will enforce the specific column-edits ("Sales can only edit Deal Value", "Qualification can only move to Contact Made") inside the React application and API routes as requested.
