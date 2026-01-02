import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Upload, 
  File, 
  Image, 
  FileText, 
  Trash2,
  ExternalLink,
  Video
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  tenantId: string;
  taskId: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

interface TaskAttachmentsProps {
  taskId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  return File;
};

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTaskAttachments(taskId);
      setAttachments(data);
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [taskId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        await apiClient.uploadTaskAttachment(taskId, file);
        toast.success(`${file.name} uploaded`);
      }
      await fetchAttachments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      await apiClient.deleteAttachment(attachment.id);
      toast.success('Attachment deleted');
      await fetchAttachments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete attachment');
      console.error(error);
    }
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
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {uploading ? 'Uploading...' : 'Upload Images/Video'}
        </Button>
      </div>

      {/* Attachments List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No attachments yet. Upload images or videos to share with your team.
          </p>
        ) : (
          attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.fileType);
            const isImage = attachment.fileType.startsWith('image/');
            const isVideo = attachment.fileType.startsWith('video/');
            const fileUrl = apiClient.getAttachmentUrl(attachment.filePath);

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  isImage ? "bg-info/10" : isVideo ? "bg-primary/10" : "bg-muted"
                )}>
                  <FileIcon className={cn(
                    "w-5 h-5",
                    isImage ? "text-info" : isVideo ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)} • {attachment.user?.name || 'Unknown'} • {format(new Date(attachment.createdAt), 'MMM d')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  {user?.id === attachment.userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(attachment)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
