import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Crown, Shield, User, Eye, Clock, X, Mail } from 'lucide-react';
import { useProjects, ProjectRole } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectMember = Database['public']['Tables']['project_members']['Row'];
type Invitation = Database['public']['Tables']['invitations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProjectWithDetails extends Project {
  members: (ProjectMember & { profile: Profile })[];
  invitations: (Invitation & { inviter: Profile | null })[];
}

interface TeamMemberListProps {
  project: ProjectWithDetails;
}

const roleConfig: Record<ProjectRole, { icon: typeof Crown; label: string; className: string }> = {
  owner: { icon: Crown, label: 'Owner', className: 'bg-warning/10 text-warning border-warning/20' },
  admin: { icon: Shield, label: 'Admin', className: 'bg-info/10 text-info border-info/20' },
  member: { icon: User, label: 'Member', className: 'bg-primary/10 text-primary border-primary/20' },
  viewer: { icon: Eye, label: 'Viewer', className: 'bg-muted text-muted-foreground border-muted' },
};

export function TeamMemberList({ project }: TeamMemberListProps) {
  const { updateMemberRole, removeMember, cancelInvitation } = useProjects();
  const { user } = useAuth();
  
  const currentUserMember = project.members.find(m => m.user_id === user?.id);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  const MemberItem = ({ member }: { member: ProjectMember & { profile: Profile } }) => {
    const role = roleConfig[member.role as ProjectRole] || roleConfig.member;
    const RoleIcon = role.icon;
    const canManage = isAdmin && member.role !== 'owner' && member.user_id !== user?.id;

    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-border/80 transition-colors">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {member.profile?.name?.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{member.profile?.name || 'Unknown'}</span>
              {member.user_id === user?.id && (
                <span className="text-xs text-muted-foreground">(You)</span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{member.profile?.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("flex items-center gap-1", role.className)}>
            <RoleIcon className="w-3 h-3" />
            {role.label}
          </Badge>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => updateMemberRole(project.id, member.id, 'admin')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Make Admin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateMemberRole(project.id, member.id, 'member')}>
                  <User className="w-4 h-4 mr-2" />
                  Make Member
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateMemberRole(project.id, member.id, 'viewer')}>
                  <Eye className="w-4 h-4 mr-2" />
                  Make Viewer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => removeMember(project.id, member.id)}
                  className="text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  const InvitationItem = ({ invitation }: { invitation: Invitation & { inviter: Profile | null } }) => {
    const role = roleConfig[invitation.role as ProjectRole] || roleConfig.member;
    
    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-dashed border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <span className="font-medium text-foreground">{invitation.email}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              Pending invitation
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("flex items-center gap-1", role.className)}>
            {role.label}
          </Badge>
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => cancelInvitation(project.id, invitation.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const pendingInvitations = project.invitations.filter(i => i.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Members */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Members ({project.members.length})
        </h4>
        <div className="space-y-2">
          {project.members.map((member) => (
            <MemberItem key={member.id} member={member} />
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2 pt-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            Pending Invitations ({pendingInvitations.length})
          </h4>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <InvitationItem key={invitation.id} invitation={invitation} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
