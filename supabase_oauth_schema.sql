-- Add this to your Supabase SQL Editor to support Google OAuth tokens

create table if not exists user_google_tokens (
  user_id uuid primary key,
  access_token text not null,
  refresh_token text,
  expiry_date bigint,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Trigger to auto-update the 'updated_at' field
create or replace function update_tokens_modtime()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

drop trigger if exists update_tokens_modtime_trigger on user_google_tokens;

create trigger update_tokens_modtime_trigger
before update on user_google_tokens
for each row execute procedure update_tokens_modtime();