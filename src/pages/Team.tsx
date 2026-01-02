import { useProjects } from '@/contexts/ProjectContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users, FolderKanban, Mail, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Team() {
  const { projects, profiles, loading } = useProjects();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Aggregate all unique team members across projects
  const allMembers = new Map<string, { 
    profile: { id: string; name: string; email: string }; 
    projectRoles: { id: string; name: string; role: string; color: string }[] 
  }>();

  projects.forEach((project) => {
    project.members.forEach((member) => {
      const existing = allMembers.get(member.user_id);
      if (existing) {
        existing.projectRoles.push({
          id: project.id,
          name: project.name,
          role: member.role,
          color: project.color,
        });
      } else {
        allMembers.set(member.user_id, {
          profile: {
            id: member.user_id,
            name: member.profile?.name || 'Unknown',
            email: member.profile?.email || '',
          },
          projectRoles: [{
            id: project.id,
            name: project.name,
            role: member.role,
            color: project.color,
          }],
        });
      }
    });
  });

  const membersArray = Array.from(allMembers.values());
  const pendingInvitations = projects.reduce((sum, p) => 
    sum + p.invitations.filter(i => i.status === 'pending').length, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">
            View all team members across your projects.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{membersArray.length}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingInvitations}</p>
                <p className="text-sm text-muted-foreground">Pending Invitations</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Members List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">All Members</h2>
          {membersArray.length > 0 ? (
            <div className="grid gap-4">
              {membersArray.map(({ profile, projectRoles }) => (
                <Card key={profile.id} className="p-5 bg-card border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-lg">
                          {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{profile.name}</h3>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {projectRoles.length} project{projectRoles.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {projectRoles.map((project) => (
                      <Link
                        key={project.id}
                        to={`/project/${project.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm text-foreground">{project.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">• {project.role}</span>
                      </Link>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No team members yet</h3>
              <p className="text-muted-foreground">
                Create a project and invite team members to get started.
              </p>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
