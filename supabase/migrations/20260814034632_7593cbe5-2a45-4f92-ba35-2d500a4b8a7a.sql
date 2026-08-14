ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'edit';
ALTER TABLE public.feedback ADD CONSTRAINT feedback_kind_check CHECK (kind IN ('edit','request','feature'));
ALTER TABLE public.feedback ALTER COLUMN destination_id DROP NOT NULL;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(message) >= 1 AND char_length(message) <= 4000);