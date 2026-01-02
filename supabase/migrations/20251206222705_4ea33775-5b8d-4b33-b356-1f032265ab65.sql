-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'completed', 'archived')),
  color TEXT NOT NULL DEFAULT '#14b8a6',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies - all authenticated users can view
CREATE POLICY "Projects are viewable by authenticated users"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project creators can insert projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create project_members table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Project members policies
CREATE POLICY "Project members are viewable by authenticated users"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project owners/admins can insert members"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
    OR auth.uid() = user_id -- Allow self-insert for accepting invitations
  );

CREATE POLICY "Project owners/admins can update members"
  ON public.project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project owners/admins can delete members"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
    OR user_id = auth.uid() -- Allow users to leave projects
  );

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(project_id, email)
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Invitations policies
CREATE POLICY "Invitations viewable by authenticated users"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project owners/admins can create invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project owners/admins can update invitations"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Project owners/admins can delete invitations"
  ON public.invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'admin')
    )
  );

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Tasks are viewable by authenticated users"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project members can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Project members can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Project owners/admins can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
    OR created_by = auth.uid()
  );

-- Update project policies for update/delete
CREATE POLICY "Project owners/admins can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id 
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project owners can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id 
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;