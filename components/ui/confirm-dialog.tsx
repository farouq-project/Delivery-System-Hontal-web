'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Konfirmasi',
  description = 'Tindakan ini tidak dapat dibatalkan.',
  confirmLabel = 'Ya, Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'destructive',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant === 'destructive' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-left text-sm text-gray-600 mt-2">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Memproses…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
