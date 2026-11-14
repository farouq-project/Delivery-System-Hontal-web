import type { Route } from '@/types';

// Klotter colors: green, blue, purple, yellow, red (cycle if more drivers)
export const KLOTTER_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
export const NO_ROUTE_COLOR = '#6b7280';

/** driver_id → color, by the order of the route's driver assignments (same on the map and in the driver area). */
export function driverColors(route: Route | null): Map<number, string> {
  const driverAssignments = (route?.assignments ?? []).filter((a) => !!a.driver);
  return new Map(driverAssignments.map((a, i) => [a.driver!.id, KLOTTER_COLORS[i % KLOTTER_COLORS.length]]));
}
