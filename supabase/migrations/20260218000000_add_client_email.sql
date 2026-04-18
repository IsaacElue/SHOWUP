-- Optional client email + per-window email reminder flags (Resend).
alter table public.appointments
  add column if not exists client_email text,
  add column if not exists reminder_24h_email_sent boolean not null default false,
  add column if not exists reminder_2h_email_sent boolean not null default false;
