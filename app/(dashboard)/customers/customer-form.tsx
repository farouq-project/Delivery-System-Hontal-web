'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi, settingsApi } from '@/lib/api';
import { Customer, LocationSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { Link2, CheckCircle2, AlertTriangle } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type LocationStatus = 'verified' | 'needs_review' | 'unknown';

const STATUS_CHIP: Record<LocationStatus, { label: string; className: string }> = {
  verified:     { label: 'Verified',     className: 'bg-green-100 text-green-700' },
  needs_review: { label: 'Needs Review', className: 'bg-amber-100 text-amber-700' },
  unknown:      { label: 'Unknown',      className: 'bg-gray-100 text-gray-500' },
};

function statusFromSource(source: LocationSource): LocationStatus {
  if (source === 'google_maps_link' || source === 'manual_pin') return 'verified';
  if (source === 'address_geocoding') return 'needs_review';
  return 'unknown';
}


// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  customer_name:   z.string().min(2),
  phone:           z.string().optional(),
  default_address: z.string().optional(),
  vip_level:       z.enum(['standard', 'silver', 'gold', 'platinum']),
  notes:           z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props { customer: Customer | null; onClose: () => void; }

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerForm({ customer, onClose }: Props) {
  const qc = useQueryClient();

  // Coordinate state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    customer?.default_latitude
      ? { lat: customer.default_latitude, lng: customer.default_longitude! }
      : null
  );
  const [locationSource, setLocationSource] = useState<LocationSource>(
    customer?.location_source ?? 'unknown'
  );

  // Maps link
  const [mapsLink, setMapsLink]       = useState('');
  const [mapsLinkError, setMapsLinkError] = useState('');
  const [extracting, setExtracting]   = useState(false);

  // Geocode button
  const [geocoding, setGeocoding] = useState(false);

  // Warning dialogs
  const [depotWarning, setDepotWarning]     = useState<{ distance: number; radius: number } | null>(null);
  const [changeWarning, setChangeWarning]   = useState<{ distance: number } | null>(null);
  const [pendingSubmit, setPendingSubmit]   = useState<FormData | null>(null);
  const [changeConfirmed, setChangeConfirmed] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer ? {
      customer_name:   customer.customer_name,
      phone:           customer.phone ?? '',
      default_address: customer.default_address ?? '',
      vip_level:       customer.vip_level,
      notes:           customer.notes ?? '',
    } : { vip_level: 'standard' },
  });

  const address = watch('default_address');

  // Load settings for depot validation
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => settingsApi.get(),
    staleTime: 300_000,
  });
  const depotLat       = settingsData?.data?.data?.depot_latitude ?? null;
  const depotLng       = settingsData?.data?.data?.depot_longitude ?? null;
  const depotRadius    = settingsData?.data?.data?.location_validation_radius ?? 30;
  const changeThreshold = settingsData?.data?.data?.location_change_warning_radius ?? 2;

  // Mutation
  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        default_latitude:  coords?.lat,
        default_longitude: coords?.lng,
        location_source:   coords ? locationSource : 'unknown',
      };
      return customer
        ? customersApi.update(customer.id, payload)
        : customersApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    },
  });

  // ── Extract from Google Maps link ──────────────────────────────────────────

  const handleExtractLink = async () => {
    if (!mapsLink.trim()) return;
    setExtracting(true);
    setMapsLinkError('');
    try {
      const res = await customersApi.resolveMapsLink(mapsLink.trim());
      const { latitude, longitude } = res.data.data;
      setCoords({ lat: latitude, lng: longitude });
      setLocationSource('google_maps_link');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not extract coordinates from that link.';
      setMapsLinkError(message);
    }
    setExtracting(false);
  };

  // ── Address geocode button ─────────────────────────────────────────────────

  const handleGeocode = async () => {
    if (!address) return;
    setGeocoding(true);
    try {
      const res = await import('@/lib/api').then(m => m.ordersApi.geocode(address));
      const { latitude, longitude } = res.data.data;
      setCoords({ lat: latitude, lng: longitude });
      setLocationSource('address_geocoding');
    } catch {}
    setGeocoding(false);
  };

  // ── Submit with pre-save validation ───────────────────────────────────────

  const runSubmit = (data: FormData) => {
    // 1. Location change detection (edit mode only)
    if (
      !changeConfirmed
      && customer?.default_latitude
      && customer?.default_longitude
      && coords
      && (coords.lat !== customer.default_latitude || coords.lng !== customer.default_longitude)
    ) {
      const dist = haversineKm(
        customer.default_latitude, customer.default_longitude,
        coords.lat, coords.lng
      );
      if (dist >= changeThreshold) {
        setPendingSubmit(data);
        setChangeWarning({ distance: Math.round(dist * 10) / 10 });
        return;
      }
    }

    // 2. Depot distance validation
    if (coords && depotLat && depotLng && !depotWarning) {
      const dist = haversineKm(coords.lat, coords.lng, depotLat, depotLng);
      if (dist > depotRadius) {
        setPendingSubmit(data);
        setDepotWarning({ distance: Math.round(dist * 10) / 10, radius: depotRadius });
        return;
      }
    }

    mutation.mutate(data);
    setPendingSubmit(null);
    setDepotWarning(null);
    setChangeWarning(null);
  };

  const handleChangeConfirm = () => {
    setChangeConfirmed(true);
    setChangeWarning(null);
    // Re-run submit — depot check still applies
    if (pendingSubmit) runSubmit(pendingSubmit);
  };

  const handleChangeKeepPrevious = () => {
    if (customer) {
      setCoords({ lat: customer.default_latitude!, lng: customer.default_longitude! });
      setLocationSource(customer.location_source ?? 'unknown');
    }
    setChangeWarning(null);
    setPendingSubmit(null);
    // Submit with reverted coords
    if (pendingSubmit) mutation.mutate(pendingSubmit);
  };

  const handleDepotProceed = () => {
    setDepotWarning(null);
    if (pendingSubmit) mutation.mutate(pendingSubmit);
  };

  const handleDepotSearchAgain = () => {
    setDepotWarning(null);
    setPendingSubmit(null);
  };

  // ── Location status indicator (user-facing) ────────────────────────────────

  const status = coords ? statusFromSource(locationSource) : 'unknown';
  const chip   = STATUS_CHIP[status];

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(runSubmit)} className="space-y-4">

            {/* Name */}
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input {...register('customer_name')} placeholder="Warung Budi 1" />
              {errors.customer_name && <p className="text-xs text-red-500">{errors.customer_name.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register('phone')} placeholder="081234567890" />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Address</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <AddressAutocomplete
                    value={address ?? ''}
                    onChange={(v) => setValue('default_address', v)}
                    onSelect={({ address: addr, lat, lng }) => {
                      setValue('default_address', addr);
                      setCoords({ lat, lng });
                      setLocationSource('manual_pin');
                    }}
                    placeholder="Jl. Dago No. 1, Bandung"
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={geocoding || !address}>
                  {geocoding ? '...' : 'Geocode'}
                </Button>
              </div>
            </div>

            {/* Google Maps Link */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-gray-400" />
                Google Maps Link
                <span className="text-xs font-normal text-gray-400">(optional — highest accuracy)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={mapsLink}
                  onChange={(e) => { setMapsLink(e.target.value); setMapsLinkError(''); }}
                  placeholder="https://maps.app.goo.gl/..."
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExtractLink}
                  disabled={extracting || !mapsLink.trim()}
                >
                  {extracting ? '...' : 'Extract'}
                </Button>
              </div>
              {mapsLinkError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {mapsLinkError}
                </p>
              )}
            </div>

            {/* Coordinates + confidence */}
            {coords ? (
              <div className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
                <span>
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-green-600" />
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Status</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${chip.className}`}>{chip.label}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No coordinates yet — use address autocomplete, Geocode, or paste a Maps link.</p>
            )}

            {/* VIP Level */}
            <div className="space-y-2">
              <Label>VIP Level</Label>
              <Select defaultValue={customer?.vip_level ?? 'standard'} onValueChange={(v) => setValue('vip_level', v as FormData['vip_level'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input {...register('notes')} placeholder="Delivery notes..." />
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-500">Save failed. Please try again.</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Location Change Warning ────────────────────────────────────────── */}
      {changeWarning && (
        <Dialog open onOpenChange={() => { setChangeWarning(null); setPendingSubmit(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Location Changed Significantly
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                This customer's location moved <span className="font-semibold">{changeWarning.distance} km</span> from
                the previous position. This may affect routing.
              </p>
              <p className="text-xs text-gray-500">
                Previous: {customer?.default_latitude?.toFixed(5)}, {customer?.default_longitude?.toFixed(5)}<br />
                New: {coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={handleChangeKeepPrevious}>
                Keep Previous
              </Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleChangeConfirm}>
                Use New
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Depot Distance Warning ────────────────────────────────────────── */}
      {depotWarning && (
        <Dialog open onOpenChange={() => { setDepotWarning(null); setPendingSubmit(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Location Outside Service Area
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                The selected location is <span className="font-semibold">{depotWarning.distance} km</span> from your depot
                — beyond the {depotWarning.radius} km validation radius.
              </p>
              <p className="text-xs text-gray-500">Please verify this location is correct before saving.</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={handleDepotSearchAgain}>
                Search Again
              </Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleDepotProceed}>
                Use Anyway
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
