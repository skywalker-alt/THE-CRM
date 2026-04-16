-- Drop existing tables if they exist
drop table if exists lead_activity;
drop table if exists tasks;
drop table if exists leads;

-- Create leads table
create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text,
  email text,
  phone text,
  website text,
  linkedin_url text,
  
  -- Context Fields
  industry text,
  location text,
  company_size text,

  -- Pipeline Fields
  lead_stage text default 'New Lead',
  qualification_status text,
  deal_status text,

  -- Sales Process Fields
  last_contact_date timestamp with time zone,
  next_followup_date timestamp with time zone,
  meeting_scheduled timestamp with time zone,
  deal_value numeric(12, 2) default 0.00,

  -- Ownership Fields (using UUID but keeping it flexible for now)
  qualification_owner uuid,
  sales_owner uuid,
  created_by uuid,

  -- Notes and Story
  lead_story text,
  internal_notes text,

  -- Customer Fields
  onboarding_status text,
  payment_status text,

  -- System Fields
  source text,
  data_quality_status text default 'needs_review',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_synced_at timestamp with time zone
);

-- Note: In a full production app, you might want to create an enum for lead_stage
-- CREATE TYPE lead_stage_enum AS ENUM ('New Lead', 'Qualify', 'Contact Made', 'Follow Up', 'Close Call', 'Onboarding', 'Payment / Notes');

-- Create tasks table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade not null,
  title text not null,
  assigned_to uuid,
  due_date timestamp with time zone,
  status text default 'Pending',
  created_at timestamp with time zone default now()
);

-- Create lead_activity table
create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade not null,
  activity_type text not null,
  description text,
  created_by uuid,
  created_at timestamp with time zone default now()
);

-- Function to automatically update the updated_at timestamp on leads
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_leads_modtime
before update on leads
for each row execute procedure update_modified_column();

-- Optional: RLS (Row Level Security) policies if needed
-- alter table leads enable row level security;
-- alter table tasks enable row level security;
-- alter table lead_activity enable row level security;

-- Create calendar_events table
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  event_type text check (event_type in ('Meeting', 'Send Email', 'Send Proposal', 'Follow-up')),
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_public boolean default false,
  created_at timestamp with time zone default now()
);

-- RLS Policies for calendar_events
alter table calendar_events enable row level security;

-- Policy: Anyone logged in can insert events
create policy "Users can create events"
  on calendar_events for insert
  with check (auth.uid() = user_id);

-- Policy: Users can view public events OR their own private events
create policy "Users can view public or own events"
  on calendar_events for select
  using (is_public = true or auth.uid() = user_id);

-- Policy: Users can update their own events
create policy "Users can update their own events"
  on calendar_events for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own events
create policy "Users can delete their own events"
  on calendar_events for delete
  using (auth.uid() = user_id);
