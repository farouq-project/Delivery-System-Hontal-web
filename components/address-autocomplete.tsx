'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

declare global {
  interface Window {
    google?: any;
    __googleMapsLoading?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (!GOOGLE_MAPS_API_KEY) return Promise.resolve();

  if (!window.__googleMapsLoading) {
    window.__googleMapsLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=id&region=ID`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }

  return window.__googleMapsLoading;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect: (result: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const sessionToken = useRef<any>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        setReady(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPredictions([]);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleChange = (text: string) => {
    onChange(text);

    if (!ready || !autocompleteService.current) return;
    clearTimeout(debounce.current);

    if (text.length < 3) {
      setPredictions([]);
      return;
    }

    debounce.current = setTimeout(() => {
      autocompleteService.current.getPlacePredictions(
        {
          input: text,
          componentRestrictions: { country: 'id' },
          sessionToken: sessionToken.current,
        },
        (preds: any[] | null, status: string) => {
          if (status === 'OK' && preds) {
            setPredictions(preds);
          } else {
            setPredictions([]);
          }
        }
      );
    }, 300);
  };

  const handleSelect = (prediction: any) => {
    setPredictions([]);
    onChange(prediction.description);

    if (!placesService.current) return;

    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ['formatted_address', 'geometry'], sessionToken: sessionToken.current },
      (place: any, status: string) => {
        if (status === 'OK' && place?.geometry?.location) {
          onSelect({
            address: place.formatted_address ?? prediction.description,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      }
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
      />
      {predictions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
              onClick={() => handleSelect(p)}
            >
              {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
