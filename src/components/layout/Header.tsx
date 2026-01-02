import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

export function Header() {
  const { currentUserProfile } = useProjects();
  const { signOut } = useAuth();
  
  const name = currentUserProfile?.name || 'User';
  const email = currentUserProfile?.email || '';
  
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search projects, tasks, or team members..." 
          className="pl-10 bg-secondary border-0 focus-visible:ring-1"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* Notifications */}
        <NotificationDropdown />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm hidden md:inline">{name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{name}</span>
                <span className="text-xs font-normal text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={signOut}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
