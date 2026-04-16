-- Enforce backend validation for lead editing based on role

create or replace function check_lead_update_permission()
returns trigger as $$
declare
    current_user_role org_role;
begin
    -- Bypass checking if user is not authenticated (for local dev with mock users)
    if auth.uid() is null then
        return new;
    end if;

    -- Get the current user's role in the organization
    select role into current_user_role
    from organization_members
    where organization_id = new.organization_id
    and user_id = auth.uid();

    -- Owners and Admins have full access
    if current_user_role in ('Owner', 'Admin') then
        return new;
    end if;

    -- Qualification Rule: Cannot edit deal_value
    if current_user_role = 'Qualification' then
        if new.deal_value is distinct from old.deal_value then
            raise exception 'Qualification team cannot edit Deal Value';
        end if;
        if new.lead_stage not in ('New Lead', 'Qualify', 'Contact Made') then
            raise exception 'Qualification team cannot move leads past Contact Made';
        end if;
    end if;

    -- Sales Rule: Cannot move backwards to Qualification stages
    if current_user_role = 'Sales' then
        if new.lead_stage in ('New Lead', 'Qualify') then
            raise exception 'Sales team cannot manage leads in Qualification stages';
        end if;
    end if;

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists lead_update_permission_trigger on leads;

create trigger lead_update_permission_trigger
before update on leads
for each row execute procedure check_lead_update_permission();
