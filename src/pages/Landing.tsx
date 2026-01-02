import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { 
  Sparkles, 
  Users, 
  FolderKanban, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Mail
} from 'lucide-react';

const features = [
  {
    icon: FolderKanban,
    title: 'Project Management',
    description: 'Organize tasks with kanban boards, track progress, and meet deadlines.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite team members, assign roles, and work together seamlessly.',
  },
  {
    icon: Mail,
    title: 'Email Invitations',
    description: 'Send invitations via email and manage pending requests easily.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Control permissions with Owner, Admin, Member, and Viewer roles.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">ProjectHub</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Link to="/dashboard">
                <Button variant="hero">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-info/20 rounded-full blur-[128px] animate-pulse-slow" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Project Management Made Simple</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
              Manage Projects,{' '}
              <span className="gradient-text">Empower Teams</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              The modern way to collaborate on projects. Invite team members, assign roles, 
              track progress, and deliver results together.
            </p>

            <div className="flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to={user ? "/dashboard" : "/auth"}>
                <Button variant="hero" size="xl">
                  {user ? "Go to Dashboard" : "Start Free"}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="glass" size="xl">
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Free to start
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Unlimited projects
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help teams collaborate effectively and deliver projects on time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-info/20" />
            <div className="relative p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to transform your workflow?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of teams already using ProjectHub to manage their projects more effectively.
              </p>
              <Link to={user ? "/dashboard" : "/auth"}>
                <Button variant="hero" size="xl">
                  {user ? "Go to Dashboard" : "Get Started for Free"}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-medium">ProjectHub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ProjectHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
