import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Calendar as CalendarIcon, 
  Paperclip, 
  MessageSquare,
  X,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects, TaskPriority } from '@/contexts/ProjectContext';
import { TaskComments } from './TaskComments';
import { TaskAttachments } from './TaskAttachments';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskDetailDialogProps {
  task: Task;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityConfig = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-info/10 text-info' },
  high: { label: 'High', className: 'bg-warning/10 text-warning' },
  urgent: { label: 'Urgent', className: 'bg-destructive/10 text-destructive' },
};

const statusConfig = {
  'todo': { label: 'To Do', className: 'bg-muted text-muted-foreground' },
  'in-progress': { label: 'In Progress', className: 'bg-info/10 text-info' },
  'review': { label: 'Review', className: 'bg-warning/10 text-warning' },
  'done': { label: 'Done', className: 'bg-success/10 text-success' },
};

export function TaskDetailDialog({ task, projectId, open, onOpenChange }: TaskDetailDialogProps) {
  const { updateTask, deleteTask } = useProjects();
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const tags = task.tags || [];

  const handleDateChange = async (date: Date | undefined) => {
    setDueDate(date);
    setCalendarOpen(false);
    await updateTask(projectId, task.id, { 
      due_date: date ? date.toISOString() : null 
    });
  };

  const handleDelete = async () => {
    await deleteTask(projectId, task.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={cn(status.className)}>
                  {status.label}
                </Badge>
                <Badge variant="secondary" className={cn(priority.className)}>
                  {priority.label}
                </Badge>
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
              <p className="text-sm text-foreground">{task.description}</p>
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Due Date</h4>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Set due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
                {dueDate && (
                  <div className="p-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive"
                      onClick={() => handleDateChange(undefined)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Tabs for Comments and Attachments */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="bg-secondary w-full justify-start">
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-4">
              <TaskComments taskId={task.id} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <TaskAttachments taskId={task.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
