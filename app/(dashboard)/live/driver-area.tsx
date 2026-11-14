'use client';

import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Lock, WifiOff, X } from 'lucide-react';
import { LiveDriver, Route, RouteAssignment, RouteStop } from '@/types';
import { DRIVER_STATUS_COLORS, STATUS_COLORS, formatDate, orderProductLines } from '@/lib/utils';
import { driverColors, NO_ROUTE_COLOR } from './colors';

interface Props {
  drivers: LiveDriver[];
  route: Route | null;
  staleDriverIds: Set<number>;
  selectedDriver: number | null;
  onSelectDriver: (driverId: number | null) => void;
  /** Owner / admin only */
  canReorder: boolean;
  savingAssignmentId: number | null;
  onReorder: (assignmentId: number, stopIds: number[]) => void;
  onFocusStop: (stop: RouteStop) => void;
  notice: string | null;
  onNotice: (message: string | null) => void;
}

type DriverAssignment = RouteAssignment & { driver: NonNullable<RouteAssignment['driver']> };

interface Column {
  driverId: number;
  name: string;
  live?: LiveDriver;
  assignment?: DriverAssignment;
}

const isDone = (stop: RouteStop) => ['delivered', 'failed'].includes(stop.order?.status ?? '');

/**
 * The live map's driver area: one column per driver with their live status and today's stops.
 * Owner / admin drag a stop up or down to change its number; the map and the driver app follow.
 */
export default function DriverArea({
  drivers, route, staleDriverIds, selectedDriver, onSelectDriver,
  canReorder, savingAssignmentId, onReorder, onFocusStop, notice, onNotice,
}: Props) {
  const colors = driverColors(route);
  const assignments = (route?.assignments ?? []).filter((a): a is DriverAssignment => !!a.driver);

  // Drivers with stops today first (in map-color order), then the other live drivers
  const columns: Column[] = [
    ...assignments.map((a) => ({
      driverId: a.driver.id,
      name: a.driver.driver_name,
      live: drivers.find((d) => d.driver_id === a.driver.id),
      assignment: a,
    })),
    ...drivers
      .filter((d) => !assignments.some((a) => a.driver.id === d.driver_id))
      .map((d) => ({ driverId: d.driver_id, name: d.driver_name, live: d })),
  ];

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination) return;
    if (source.droppableId !== destination.droppableId) {
      onNotice('A stop can only move within its own driver. To change the driver, use the Dispatch page.');
      return;
    }
    if (source.index === destination.index) return;

    const assignmentId = Number(source.droppableId.replace('assignment-', ''));
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const stops = [...assignment.stops].sort((a, b) => a.stop_sequence - b.stop_sequence);
    const crossesLocked = stops
      .slice(Math.min(source.index, destination.index), Math.max(source.index, destination.index) + 1)
      .some((s) => s.is_locked);
    if (crossesLocked) {
      onNotice('A locked stop keeps its number. Unlock it on the Dispatch page before moving stops across it.');
      return;
    }

    const ids = stops.map((s) => s.id);
    const [moved] = ids.splice(source.index, 1);
    ids.splice(destination.index, 0, moved);
    onNotice(null);
    onReorder(assignmentId, ids);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {notice && (
        <div className="mx-3 mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          <span className="flex-1">{notice}</span>
          <button onClick={() => onNotice(null)} className="text-amber-500 hover:text-amber-700" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 flex overflow-x-auto overscroll-x-contain p-2">
        {columns.length === 0 && <p className="m-auto text-sm text-gray-400">No drivers yet.</p>}
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((col) => (
            <DriverColumn
              key={col.driverId}
              column={col}
              color={colors.get(col.driverId) ?? NO_ROUTE_COLOR}
              stale={staleDriverIds.has(col.driverId)}
              selected={selectedDriver === col.driverId}
              onSelect={() => onSelectDriver(selectedDriver === col.driverId ? null : col.driverId)}
              canReorder={canReorder}
              saving={savingAssignmentId === col.assignment?.id}
              onFocusStop={onFocusStop}
            />
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

interface ColumnProps {
  column: Column;
  color: string;
  stale: boolean;
  selected: boolean;
  onSelect: () => void;
  canReorder: boolean;
  saving: boolean;
  onFocusStop: (stop: RouteStop) => void;
}

function DriverColumn({ column, color, stale, selected, onSelect, canReorder, saving, onFocusStop }: ColumnProps) {
  const { live, assignment } = column;
  const stops = assignment ? [...assignment.stops].sort((a, b) => a.stop_sequence - b.stop_sequence) : [];
  const done = stops.filter(isDone).length;
  const status = live?.status ?? assignment?.driver.status;

  return (
    <div
      className={`w-[82vw] max-w-72 sm:w-72 flex-shrink-0 bg-gray-50 rounded-lg border mx-1.5 flex flex-col max-h-full min-h-0 ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Driver — click to find on the map */}
      <button
        type="button"
        onClick={onSelect}
        className="text-left px-3 py-2 border-b bg-white rounded-t-lg hover:bg-gray-50"
        style={{ borderTop: `4px solid ${color}` }}
        title="Show on map"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{column.name}</p>
            {live && <p className="text-xs text-gray-400 truncate">{live.vehicle_plate ?? live.vehicle_type}</p>}
          </div>
          {status && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${DRIVER_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
              {status.replace('_', ' ')}
            </span>
          )}
        </div>
        {live && (stale ? (
          <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
            <WifiOff className="h-3 w-3" /> GPS off
            {live.last_seen && <span className="text-gray-400">· last seen {formatDate(live.last_seen, 'HH:mm')}</span>}
          </p>
        ) : (
          <p className="text-xs text-green-600 mt-1">GPS live · {formatDate(live.last_seen, 'HH:mm')}</p>
        ))}
        <div className="flex gap-3 mt-1 text-xs text-gray-500">
          <span>{done}/{stops.length} stops done</span>
          {saving && <span className="ml-auto text-blue-500">Saving…</span>}
        </div>
      </button>

      {/* Stops */}
      {assignment ? (
        <Droppable droppableId={`assignment-${assignment.id}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5 ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
            >
              {stops.map((stop, idx) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={idx}
                  color={color}
                  canDrag={canReorder && !stop.is_locked && !isDone(stop)}
                  onFocus={() => onFocusStop(stop)}
                />
              ))}
              {provided.placeholder}
              {stops.length === 0 && <p className="py-4 text-center text-xs text-gray-400">No stops today</p>}
            </div>
          )}
        </Droppable>
      ) : (
        <p className="py-4 text-center text-xs text-gray-400">No stops today</p>
      )}
    </div>
  );
}

function StopCard({ stop, index, color, canDrag, onFocus }: {
  stop: RouteStop;
  index: number;
  color: string;
  canDrag: boolean;
  onFocus: () => void;
}) {
  const order = stop.order;
  const done = isDone(stop);
  const products = order ? orderProductLines(order) : [];

  return (
    <Draggable draggableId={String(stop.id)} index={index} isDragDisabled={!canDrag}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style as React.CSSProperties}
          onClick={onFocus}
          className={`bg-white rounded border p-2 text-xs ${
            snapshot.isDragging ? 'shadow-lg border-blue-400' : 'border-gray-200'
          } ${stop.is_locked ? 'border-orange-300 bg-orange-50' : ''} ${done ? 'opacity-60' : ''} ${
            canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
          }`}
          title={canDrag ? 'Drag to change the stop number · click to show on map' : 'Click to show on map'}
        >
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
              style={{ backgroundColor: done ? '#9ca3af' : color }}
            >
              {stop.stop_sequence}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="font-medium truncate">{order?.customer_name}</p>
                <span className={`px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[order?.status ?? 'pending']}`}>
                  {order?.status?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-gray-400 truncate">{order?.delivery_address}</p>
              {products.length > 0 && <p className="text-gray-600 truncate">📦 {products.join(', ')}</p>}
            </div>
            {stop.is_locked && <Lock className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />}
            {canDrag && <GripVertical className="h-4 w-4 mt-0.5 text-gray-300 shrink-0" aria-hidden />}
          </div>
        </div>
      )}
    </Draggable>
  );
}
