-- Email confirmation links (unique per row). Backfill existing rows.
alter table public.appointments
  add column if not exists confirmation_token text;

update public.appointments
set confirmation_token = gen_random_uuid()::text
where confirmation_token is null;

alter table public.appointments
  alter column confirmation_token set not null;

drop index if exists appointments_confirmation_token_key;

create unique index appointments_confirmation_token_key
  on public.appointments (confirmation_token);
