import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CommentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface TaskComment {
  id: string;
  tenantId: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: CommentUser;
}

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTaskComments(taskId);
      setComments(data);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // TODO: Add polling or WebSocket for real-time updates
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      await apiClient.createTaskComment(taskId, newComment.trim());
      setNewComment('');
      await fetchComments(); // Refresh comments
    } catch (error: any) {
      toast.error(error.message || 'Failed to add comment');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await apiClient.deleteComment(commentId);
      toast.success('Comment deleted');
      await fetchComments(); // Refresh comments
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete comment');
      console.error(error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 rounded-lg bg-secondary/50 group"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={comment.user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {comment.user ? getInitials(comment.user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {comment.user?.name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {user?.id === comment.userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground mt-1">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="bg-secondary border-0 min-h-[60px] resize-none flex-1"
        />
        <Button
          type="submit"
          size="icon"
          variant="hero"
          disabled={!newComment.trim() || submitting}
          className="flex-shrink-0"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
