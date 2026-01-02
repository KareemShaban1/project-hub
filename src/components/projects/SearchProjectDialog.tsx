import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface SearchProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSent?: () => void;
}

export function SearchProjectDialog({ open, onOpenChange, onRequestSent }: SearchProjectDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!code.trim()) {
      toast.error('Please enter a project code');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.searchProjectByCode(code.toUpperCase());
      setProject(result);
    } catch (error: any) {
      toast.error(error.message || 'Project not found');
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!project) return;

    setSending(true);
    try {
      await apiClient.createJoinRequest(project.code, message || undefined);
      toast.success('Join request sent successfully!');
      setProject(null);
      setCode('');
      setMessage('');
      onRequestSent?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send join request');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Search Project by Code</DialogTitle>
          <DialogDescription>
            Enter a project code to find and request to join a project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Project Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="Enter project code (e.g., ABC123)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="uppercase"
                maxLength={20}
              />
              <Button onClick={handleSearch} disabled={loading || !code.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {project && (
            <div className="space-y-4 border rounded-lg p-4 bg-card">
              {project.isMember ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">You are already a member of this project</span>
                </div>
              ) : project.hasPendingRequest ? (
                <div className="flex items-center gap-2 text-warning">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">You have a pending request for this project</span>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: project.color }}
                      />
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Code: <span className="font-mono font-semibold">{project.code}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Add a message to your join request..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSendRequest}
                    disabled={sending}
                    className="w-full"
                    variant="default"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      'Send Join Request'
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {project === null && !loading && code && (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span>No project found with this code</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

