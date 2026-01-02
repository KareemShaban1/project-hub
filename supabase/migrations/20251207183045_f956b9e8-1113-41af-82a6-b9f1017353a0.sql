-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_comments
CREATE POLICY "Comments viewable by authenticated users"
ON public.task_comments FOR SELECT
USING (true);

CREATE POLICY "Users can create comments"
ON public.task_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.task_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.task_comments FOR DELETE
USING (auth.uid() = user_id);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attachments
CREATE POLICY "Attachments viewable by authenticated users"
ON public.task_attachments FOR SELECT
USING (true);

CREATE POLICY "Users can upload attachments"
ON public.task_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
ON public.task_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_log
CREATE POLICY "Activity viewable by authenticated users"
ON public.activity_log FOR SELECT
USING (true);

CREATE POLICY "System can insert activity"
ON public.activity_log FOR INSERT
WITH CHECK (true);

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Storage policies for task-attachments bucket
CREATE POLICY "Attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their uploaded attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;