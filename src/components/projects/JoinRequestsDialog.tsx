import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface JoinRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onRequestProcessed?: () => void;
}

export function JoinRequestsDialog({ open, onOpenChange, projectId, onRequestProcessed }: JoinRequestsDialogProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (open && projectId) {
      loadRequests();
    }
  }, [open, projectId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getProjectJoinRequests(projectId);
      setRequests(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await apiClient.acceptJoinRequest(requestId);
      toast.success('Join request accepted');
      await loadRequests();
      onRequestProcessed?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept request');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await apiClient.declineJoinRequest(requestId);
      toast.success('Join request declined');
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline request');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Join Requests</DialogTitle>
          <DialogDescription>
            Manage pending requests to join this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending join requests
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 bg-card space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {request.user.name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{request.user.name || request.user.email}</div>
                    <div className="text-sm text-muted-foreground">{request.user.email}</div>
                  </div>
                </div>

                {request.message && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {request.message}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Requested {new Date(request.createdAt).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAccept(request.id)}
                    disabled={processing === request.id}
                    className="flex-1"
                  >
                    {processing === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(request.id)}
                    disabled={processing === request.id}
                    className="flex-1"
                  >
                    {processing === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Decline
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

