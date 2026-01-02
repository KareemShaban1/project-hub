import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Settings, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', path: '/projects' },
  { icon: Users, label: 'Team', path: '/team' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { projects } = useProjects();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">ProjectHub</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/projects' && location.pathname.startsWith('/project/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Recent Projects */}
      {!collapsed && projects.length > 0 && (
        <div className="px-4 py-4 border-t border-sidebar-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Projects
          </h3>
          <div className="space-y-1">
            {projects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <div 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Link to="/projects">
          <Button 
            variant={collapsed ? "ghost" : "hero"} 
            size={collapsed ? "icon" : "default"}
            className={cn("w-full", collapsed && "justify-center")}
          >
            <Plus className="w-4 h-4" />
            {!collapsed && <span>New Project</span>}
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size={collapsed ? "icon" : "default"}
          className={cn("w-full text-muted-foreground hover:text-destructive", collapsed && "justify-center")}
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
