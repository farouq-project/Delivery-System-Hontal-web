'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { driverApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle } from 'lucide-react';

interface Props { stopId: number; onClose: () => void; }

export default function DeliverModal({ stopId, onClose }: Props) {
  const qc = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('signature_name', 'Customer');
      if (photo) fd.append('photo', photo);
      if (notes) fd.append('notes', notes);
      return driverApi.deliver(stopId, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-today'] });
      onClose();
    },
    onError: (err: unknown) => {
      // If there is no HTTP response (network drop, timeout), the request likely
      // reached the server and was saved — refresh and close so the driver
      // sees the correct "delivered" status without a confusing error.
      const hasServerResponse = !!(err as { response?: unknown })?.response;
      if (!hasServerResponse) {
        qc.invalidateQueries({ queryKey: ['driver-today'] });
        onClose();
      }
      // If there IS a response (4xx/5xx), leave the modal open so the driver
      // can retry — the delivery was not recorded in that case.
    },
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-6">
        <h3 className="font-bold text-lg mb-4">Confirm Delivery</h3>

        {/* Photo capture */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 mb-4 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="POD" className="max-h-32 mx-auto rounded-lg" />
          ) : (
            <div>
              <Camera className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">Tap to take proof-of-delivery photo</p>
              <p className="text-xs text-gray-300">(Optional but recommended)</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </div>

        {/* Notes */}
        <input
          type="text"
          placeholder="Notes (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {mutation.isError && (
          <p className="text-xs text-red-500 mb-2">Failed to record delivery. Try again.</p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <CheckCircle className="h-4 w-4" />
            {mutation.isPending ? 'Submitting...' : 'Mark Delivered'}
          </Button>
        </div>
      </div>
    </div>
  );
}
