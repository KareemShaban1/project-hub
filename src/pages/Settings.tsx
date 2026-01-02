import { useProjects } from '@/contexts/ProjectContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Bell, Lock, Loader2 } from 'lucide-react';

export default function Settings() {
  const { currentUserProfile, loading } = useProjects();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const name = currentUserProfile?.name || 'User';
  const email = currentUserProfile?.email || '';

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Profile Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Your personal information and profile settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button variant="outline" size="sm">Change Avatar</Button>
                <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max size 2MB.</p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={name} className="bg-secondary border-0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={email} className="bg-secondary border-0" disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>
            <Button variant="hero">Save Changes</Button>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive project updates via email</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Task Assignments</p>
                <p className="text-sm text-muted-foreground">Get notified when assigned to a task</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Project Invitations</p>
                <p className="text-sm text-muted-foreground">Receive notifications for new invitations</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your password and security settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" className="bg-secondary border-0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" className="bg-secondary border-0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" className="bg-secondary border-0" />
              </div>
            </div>
            <Button variant="outline">Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
