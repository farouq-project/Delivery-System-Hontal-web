'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  correctPin: string;
}

export default function PinDialog({ onSuccess, onCancel, correctPin }: Props) {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState(false);

  const verify = () => {
    if (pin === correctPin) {
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-xs" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Owner PIN Required
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">This order is already assigned. Enter the owner PIN to edit it.</p>
          <div className="space-y-1">
            <Label>PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
              placeholder="Enter PIN"
            />
            {error && <p className="text-xs text-red-500">Incorrect PIN. Try again.</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={verify} disabled={pin.length === 0}>Confirm</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
