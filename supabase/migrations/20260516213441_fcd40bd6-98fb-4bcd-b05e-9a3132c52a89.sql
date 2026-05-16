
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  link_url text,
  send_to_all boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
CREATE INDEX idx_announcement_recipients_user ON public.announcement_recipients(user_id);
CREATE INDEX idx_announcement_recipients_announcement ON public.announcement_recipients(announcement_id);

CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads(user_id);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage announcements" ON public.announcements
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "recipients view announcements" ON public.announcements
FOR SELECT TO authenticated
USING (
  send_to_all = true
  OR EXISTS (
    SELECT 1 FROM public.announcement_recipients r
    WHERE r.announcement_id = announcements.id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "admins manage recipients" ON public.announcement_recipients
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users view own recipient rows" ON public.announcement_recipients
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins view all reads" ON public.announcement_reads
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users view own reads" ON public.announcement_reads
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users insert own reads" ON public.announcement_reads
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read announcement images" ON storage.objects
FOR SELECT USING (bucket_id = 'announcements');

CREATE POLICY "admins upload announcement images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'announcements' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update announcement images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'announcements' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete announcement images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'announcements' AND private.has_role(auth.uid(), 'admin'::app_role));
