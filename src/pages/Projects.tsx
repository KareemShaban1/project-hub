import { useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { SearchProjectDialog } from '@/components/projects/SearchProjectDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FolderKanban, Loader2, Plus } from 'lucide-react';
import type { ProjectStatus } from '@/contexts/ProjectContext';

export default function Projects() {
  const { projects, loading, refetchProjects } = useProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize all your projects in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSearchDialogOpen(true)}
            >
              <Search className="w-4 h-4 mr-2" />
              Join Project
            </Button>
            <CreateProjectDialog />
          </div>
        </div>

        <SearchProjectDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
          onRequestSent={() => {
            refetchProjects();
          }}
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-0"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'all')}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="on-hold">On Hold</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project, index) => (
              <div key={project.id} style={{ animationDelay: `${index * 0.05}s` }}>
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {search ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try adjusting your search or filters' : 'Create your first project to get started'}
            </p>
            {!search && <CreateProjectDialog />}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
