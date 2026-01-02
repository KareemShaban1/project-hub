import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Check, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function PendingInvitationsBanner() {
  const { pendingInvitations, acceptInvitation, declineInvitation } = useProjects();

  if (pendingInvitations.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Mail className="w-4 h-4" />
        <span>You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''}</span>
      </div>
      
      {pendingInvitations.map((invitation) => (
        <Card key={invitation.id} className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                You've been invited to join <span className="text-primary">{invitation.project.name}</span>
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>Role: <span className="capitalize font-medium">{invitation.role}</span></span>
                {invitation.inviter && (
                  <span>• Invited by {invitation.inviter.name}</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => declineInvitation(invitation.id)}
              >
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
              <Button
                variant="hero"
                size="sm"
                onClick={() => acceptInvitation(invitation.id)}
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
