-- Drop existing permissive SELECT policies
DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Project members are viewable by authenticated users" ON public.project_members;
DROP POLICY IF EXISTS "Invitations viewable by authenticated users" ON public.invitations;
DROP POLICY IF EXISTS "Activity viewable by authenticated users" ON public.activity_log;
DROP POLICY IF EXISTS "Comments viewable by authenticated users" ON public.task_comments;
DROP POLICY IF EXISTS "Attachments viewable by authenticated users" ON public.task_attachments;

-- Create helper function to check project membership
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

-- Create helper function to check if user has pending invitation
CREATE OR REPLACE FUNCTION public.has_project_invitation(_user_email text, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invitations
    WHERE LOWER(email) = LOWER(_user_email) 
    AND project_id = _project_id 
    AND status = 'pending'
  )
$$;

-- Projects: only visible to members or invited users
CREATE POLICY "Projects viewable by members or invited users"
ON public.projects FOR SELECT
TO authenticated
USING (
  public.is_project_member(auth.uid(), id)
  OR public.has_project_invitation(
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    id
  )
);

-- Project members: only visible to project members
CREATE POLICY "Project members viewable by project members"
ON public.project_members FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Tasks: only visible to project members
CREATE POLICY "Tasks viewable by project members"
ON public.tasks FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Invitations: visible to project members OR the invited user
CREATE POLICY "Invitations viewable by members or invitee"
ON public.invitations FOR SELECT
TO authenticated
USING (
  public.is_project_member(auth.uid(), project_id)
  OR LOWER(email) = LOWER((SELECT email FROM public.profiles WHERE id = auth.uid()))
);

-- Activity log: only visible to project members
CREATE POLICY "Activity viewable by project members"
ON public.activity_log FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Task comments: only visible to project members
CREATE POLICY "Comments viewable by project members"
ON public.task_comments FOR SELECT
TO authenticated
USING (
  public.is_project_member(auth.uid(), (SELECT project_id FROM public.tasks WHERE id = task_id))
);

-- Task attachments: only visible to project members  
CREATE POLICY "Attachments viewable by project members"
ON public.task_attachments FOR SELECT
TO authenticated
USING (
  public.is_project_member(auth.uid(), (SELECT project_id FROM public.tasks WHERE id = task_id))
);