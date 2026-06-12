'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UploadCloud } from 'lucide-react';

export default function CustomerImportDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (f: File) => customersApi.import(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const handleImport = () => {
    if (file) mutation.mutate(file);
  };

  const result = mutation.data?.data;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Import Customers</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Upload an Excel (.xlsx) or CSV file. The first row must contain column headers.
            Only <span className="font-medium">customer_name</span> (or &quot;name&quot;) is required —
            other columns (phone, email, default_address, vip_level, notes) can be left empty.
          </p>

          <div
            className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{file ? file.name : 'Click to select a file'}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {result && (
            <div className="text-sm space-y-1">
              <p className="text-green-600">{result.message}</p>
              {result.errors?.length > 0 && (
                <ul className="text-xs text-red-500 list-disc pl-4">
                  {result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          {mutation.isError && <p className="text-xs text-red-500">Import failed. Please check the file format.</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <Button type="button" onClick={handleImport} disabled={!file || mutation.isPending}>
              {mutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
