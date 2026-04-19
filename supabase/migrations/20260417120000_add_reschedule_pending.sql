-- Pending client reschedule: proposed time + opaque token for owner accept/decline links.
alter table public.appointments
  add column if not exists reschedule_pending_at timestamptz;

alter table public.appointments
  add column if not exists reschedule_owner_token text;

drop index if exists appointments_reschedule_owner_token_key;

create unique index appointments_reschedule_owner_token_key
  on public.appointments (reschedule_owner_token)
  where reschedule_owner_token is not null;
