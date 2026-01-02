import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectCode: string;
  projectName: string;
}

export function ProjectCodeDialog({ open, onOpenChange, projectCode, projectName }: ProjectCodeDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(projectCode);
      setCopied(true);
      toast.success('Project code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleShare = async () => {
    const shareText = `Join my project "${projectName}" on ProjectHub!\n\nProject Code: ${projectCode}\n\nUse this code to join the project.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${projectName}`,
          text: shareText,
        });
        toast.success('Shared successfully!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Fallback to copy if share fails
          await navigator.clipboard.writeText(shareText);
          toast.success('Share text copied to clipboard!');
        }
      }
    } else {
      // Fallback to copy
      await navigator.clipboard.writeText(shareText);
      toast.success('Share text copied to clipboard!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Code</DialogTitle>
          <DialogDescription>
            Share this code with others so they can join your project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Project Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={projectCode}
                readOnly
                className="font-mono text-lg font-bold text-center"
              />
              <Button onClick={handleCopy} variant="outline" size="icon">
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">How to share:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Copy the project code above</li>
              <li>Share it with the person you want to invite</li>
              <li>They can use "Join Project" button and enter the code</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleShare} variant="default" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Share Code
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

