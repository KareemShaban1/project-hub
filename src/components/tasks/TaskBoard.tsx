import { useState, useMemo } from 'react';
import { useProjects, TaskStatus, TaskPriority } from '@/contexts/ProjectContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical, Calendar, Settings } from 'lucide-react';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectWithDetails } from '@/contexts/ProjectContext';

interface TaskBoardProps {
  project: ProjectWithDetails;
}

// Default columns - can be customized
const defaultColumns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'To Do', color: 'bg-muted' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-info/20' },
  { id: 'REVIEW', label: 'Review', color: 'bg-warning/20' },
  { id: 'DONE', label: 'Done', color: 'bg-success/20' },
];

const priorityConfig = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-info/10 text-info' },
  high: { label: 'High', className: 'bg-warning/10 text-warning' },
  urgent: { label: 'Urgent', className: 'bg-destructive/10 text-destructive' },
};

export function TaskBoard({ project }: TaskBoardProps) {
  const { updateTask } = useProjects();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('TODO');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [columns, setColumns] = useState(defaultColumns);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  
  // Load custom columns from localStorage
  useMemo(() => {
    const saved = localStorage.getItem(`task-columns-${project.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved columns', e);
      }
    }
  }, [project.id]);
  
  const saveColumns = (newColumns: typeof columns) => {
    setColumns(newColumns);
    localStorage.setItem(`task-columns-${project.id}`, JSON.stringify(newColumns));
  };
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    // Only allow dropping on columns with valid statuses
    const validStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const columnId = (status || '').toUpperCase();
    
    // If column has a unique ID (not a valid status), don't update
    if (!validStatuses.includes(columnId)) {
      console.warn('Cannot drop task on column with invalid status:', columnId);
      return;
    }
    
    // Convert status to uppercase for API
    const apiStatus = columnId as TaskStatus;
    updateTask(project.id, taskId, { status: apiStatus });
  };

  const TaskCard = ({ task }: { task: any }) => {
    // Handle both uppercase and lowercase priority
    const priorityKey = (task.priority?.toLowerCase() || 'medium') as keyof typeof priorityConfig;
    const priority = priorityConfig[priorityKey] || priorityConfig.medium;
    const tags = Array.isArray(task.tags) ? task.tags : (typeof task.tags === 'string' ? JSON.parse(task.tags || '[]') : []);
    
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onClick={() => setSelectedTask(task)}
        className="group bg-card p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer active:cursor-grabbing transition-all duration-200 hover:shadow-card"
      >
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground mb-1 line-clamp-2">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={cn("text-xs", priority.className)}>
                {priority.label}
              </Badge>
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              {(task.dueDate || task.due_date) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate || task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Task Board</h2>
        <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Customize Columns
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize Task Columns</DialogTitle>
              <DialogDescription>
                Add, remove, or reorder columns for your task board.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {columns.map((column, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={column.label}
                    onChange={(e) => {
                      const newColumns = [...columns];
                      newColumns[index].label = e.target.value;
                      saveColumns(newColumns);
                    }}
                    className="flex-1"
                    placeholder="Column name"
                  />
                  <Select
                    value={['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(column.id) ? column.id : 'TODO'}
                    onValueChange={(value: TaskStatus) => {
                      const newColumns = [...columns];
                      newColumns[index].id = value;
                      saveColumns(newColumns);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(column.id) ? undefined : 'Select status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newColumns = columns.filter((_, i) => i !== index);
                      saveColumns(newColumns);
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  // Add new column with a unique status ID that won't match any existing tasks
                  // This ensures new columns start empty
                  // User can change the status using the dropdown to show tasks
                  const uniqueId = `NEW_COLUMN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as TaskStatus;
                  const newColumn = { id: uniqueId, label: 'New Column', color: 'bg-muted' };
                  saveColumns([...columns, newColumn]);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(250px, 1fr))` }}>
        {columns.map((column) => {
          // Handle both uppercase and lowercase status
          // Normalize both task status and column id to uppercase for comparison
          // Only show tasks that exactly match the column's status
          // Custom/new columns (with unique IDs) won't match any tasks
          const validStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
          const columnId = (column.id || '').toUpperCase();
          
          // Check if this is a valid status column
          const isValidStatus = validStatuses.includes(columnId);
          
          // Filter tasks based on whether column has a valid status
          const columnTasks = isValidStatus 
            ? (project.tasks || []).filter((t: any) => {
                const taskStatus = (t.status || '').toUpperCase();
                // Exact match only - each task should only appear in one column
                return taskStatus === columnId;
              })
            : []; // Empty array for custom/new columns with unique IDs
          
          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="flex flex-col"
            >
              <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between", column.color)}>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-foreground">{column.label}</h3>
                  <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                    {columnTasks.length}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 bg-secondary/30 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground justify-start"
                  onClick={() => {
                    setCreateStatus(column.id);
                    setCreateDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add task
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateTaskDialog
        projectId={project.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultStatus={createStatus}
      />

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          projectId={project.id}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}
    </>
  );
}
