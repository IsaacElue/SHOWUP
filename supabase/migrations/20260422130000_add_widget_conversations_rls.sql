ALTER TABLE public.widget_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their conversations"
ON public.widget_conversations;

CREATE POLICY "Business owners can view their conversations"
ON public.widget_conversations
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.businesses
    WHERE user_id = auth.uid()
  )
);
