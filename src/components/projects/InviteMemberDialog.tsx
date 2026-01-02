import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Mail, Shield, Copy, Check } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { ProjectRole } from '@/types/project';
import { toast } from 'sonner';

interface InviteMemberDialogProps {
  projectId: string;
}

const roleDescriptions: Record<ProjectRole, string> = {
  owner: 'Full control over the project',
  admin: 'Can manage members and settings',
  member: 'Can create and edit tasks',
  viewer: 'Can only view project content',
};

export function InviteMemberDialog({ projectId }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('member');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { inviteMember, projects } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    
    setIsSubmitting(true);
    
    try {
      // Create invitation and get the token from response
      const invitation = await inviteMember(projectId, email.trim(), role);
      
      if (invitation?.token) {
        const link = `${window.location.origin}/invite/${invitation.token}`;
        setInviteLink(link);
      }
    } catch (error) {
      // Error already handled in inviteMember
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setRole('member');
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {inviteLink ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-success" />
                Invitation Sent
              </DialogTitle>
              <DialogDescription>
                An invitation has been sent to {email}. You can also share this link directly:
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="bg-secondary border-0 font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This link will expire in 7 days.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button variant="hero" onClick={() => {
                setInviteLink(null);
                setEmail('');
              }}>
                Invite Another
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Invite Team Member
              </DialogTitle>
              <DialogDescription>
                Send an invitation to collaborate on this project. They'll receive a link to join.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="bg-secondary border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Role
                </Label>
                <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Admin</span>
                        <span className="text-xs text-muted-foreground">{roleDescriptions.admin}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Member</span>
                        <span className="text-xs text-muted-foreground">{roleDescriptions.member}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Viewer</span>
                        <span className="text-xs text-muted-foreground">{roleDescriptions.viewer}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={!email.trim() || !email.includes('@') || isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
