-- Pending booking payload while user confirms in the widget chat flow.
ALTER TABLE public.widget_conversations
ADD COLUMN IF NOT EXISTS pending_booking jsonb;
