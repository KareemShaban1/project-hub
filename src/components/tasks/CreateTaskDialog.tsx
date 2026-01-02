import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects, TaskStatus, TaskPriority } from '@/contexts/ProjectContext';
interface CreateTaskDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: TaskStatus;
}

export function CreateTaskDialog({ projectId, open, onOpenChange, defaultStatus = 'todo' }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { createTask } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      await createTask(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        due_date: dueDate?.toISOString(),
      });
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus(defaultStatus);
    setPriority('medium');
    setTags('');
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description..."
                className="bg-secondary border-0 min-h-[80px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="design, frontend, bug"
                  className="bg-secondary border-0"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-secondary border-0",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date);
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                    {dueDate && (
                      <div className="p-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-destructive"
                          onClick={() => {
                            setDueDate(undefined);
                            setCalendarOpen(false);
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={!title.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
