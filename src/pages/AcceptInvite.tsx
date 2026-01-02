import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X, AlertCircle, Mail } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<{
    id: string;
    email: string;
    role: string;
    status: string;
    projectId: string;
    expiresAt: string;
    project?: { name: string; description: string | null };
    inviter?: { name: string; email: string } | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient.getInvitation(token);

        if (!data) {
          setError('Invitation not found');
          setLoading(false);
          return;
        }

        if (data.status !== 'PENDING') {
          setError('This invitation has already been used');
          setLoading(false);
          return;
        }

        if (new Date(data.expiresAt) < new Date()) {
          setError('This invitation has expired');
          setLoading(false);
          return;
        }

        setInvitation({
          id: data.id,
          email: data.email,
          role: data.role,
          status: data.status,
          projectId: data.projectId,
          expiresAt: data.expiresAt,
          project: data.project ? {
            name: data.project.name,
            description: data.project.description || null
          } : undefined,
          inviter: data.inviter ? {
            name: data.inviter.name,
            email: data.inviter.email
          } : undefined
        });
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching invitation:', err);
        setError(err.message || 'Failed to load invitation');
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!invitation || !user || !token) return;

    // Check if user email matches invitation email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(`This invitation was sent to ${invitation.email}. Please sign in with that email address.`);
      return;
    }

    setProcessing(true);

    try {
      await apiClient.acceptInvitation(token);
      
      // Navigate to the project
      navigate(`/project/${invitation.projectId}`);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      if (err.message?.includes('already a member')) {
        setError('You are already a member of this project');
      } else if (err.message?.includes('email does not match')) {
        setError(`This invitation was sent to ${invitation.email}. Please sign in with that email address.`);
      } else {
        setError(err.message || 'Failed to accept invitation');
      }
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    setProcessing(true);

    // For now, just navigate away
    // TODO: Add decline endpoint if needed
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Unable to Process Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Project Invitation</CardTitle>
            <CardDescription>
              You've been invited to join <span className="font-semibold text-foreground">{invitation?.project?.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Please sign in or create an account with <span className="font-medium text-foreground">{invitation?.email}</span> to accept this invitation.
            </p>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Sign In / Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Project Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">{invitation?.project?.name}</h3>
            {invitation?.project?.description && (
              <p className="text-sm text-muted-foreground">{invitation.project.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm pt-2">
              <span>
                Role: <span className="font-medium capitalize">{invitation?.role}</span>
              </span>
              {invitation?.inviter && (
                <span className="text-muted-foreground">
                  Invited by {invitation.inviter.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={processing}
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleAccept}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
