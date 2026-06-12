'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi } from '@/lib/api';
import { Route, RouteAssignment, RouteStop } from '@/types';
import { STATUS_COLORS, DRIVER_STATUS_COLORS, formatCurrency, formatTime, VIP_COLORS } from '@/lib/utils';
import { GripVertical, Lock, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { route: Route; }

export default function DispatchBoard({ route }: Props) {
  const qc = useQueryClient();
  const isLocked = !!route.locked_at;

  const removeStop = useMutation({
    mutationFn: ({ stopId }: { stopId: number }) => routesApi.removeStop(route.id, stopId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  });

  const updateStop = useMutation({
    mutationFn: ({ stopId, data }: { stopId: number; data: Record<string, unknown> }) =>
      routesApi.updateStop(route.id, stopId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || isLocked) return;
    const { draggableId, destination } = result;
    const stopId = parseInt(draggableId);
    updateStop.mutate({ stopId, data: { sequence_number: destination.index + 1 } });
  };

  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex gap-0 h-full overflow-x-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          {route.assignments.map((assignment) => (
            <AssignmentColumn
              key={assignment.id}
              assignment={assignment}
              isLocked={isLocked}
              onRemove={(stopId) => removeStop.mutate({ stopId })}
              onToggleLock={(stopId, locked) => updateStop.mutate({ stopId, data: { is_locked: locked } })}
            />
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

interface ColumnProps {
  assignment: RouteAssignment;
  isLocked: boolean;
  onRemove: (stopId: number) => void;
  onToggleLock: (stopId: number, locked: boolean) => void;
}

function AssignmentColumn({ assignment, isLocked, onRemove, onToggleLock }: ColumnProps) {
  const delivered = assignment.stops.filter((s) => s.order?.status === 'delivered').length;

  return (
    <div className="w-80 flex-shrink-0 bg-gray-50 rounded-lg border mx-2 flex flex-col max-h-full">
      {/* Column header */}
      <div className="p-3 border-b bg-white rounded-t-lg">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-sm">{assignment.driver.driver_name}</h3>
            <p className="text-xs text-gray-400">Driver #{assignment.driver.id}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${DRIVER_STATUS_COLORS[assignment.driver.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {assignment.driver.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          <span>{assignment.stops.length} stops</span>
          <span>{delivered} done</span>
          <span>{((assignment.total_distance_m ?? 0) / 1000).toFixed(1)} km</span>
        </div>
        <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-1.5 bg-green-500 rounded-full transition-all"
            style={{ width: `${assignment.stops.length ? (delivered / assignment.stops.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Stops */}
      <Droppable droppableId={`assignment-${assignment.id}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-2 space-y-1.5 ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
          >
            {assignment.stops
              .sort((a, b) => a.stop_sequence - b.stop_sequence)
              .map((stop, idx) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={idx}
                  isLocked={isLocked}
                  onRemove={onRemove}
                  onToggleLock={onToggleLock}
                />
              ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

interface StopCardProps {
  stop: RouteStop;
  index: number;
  isLocked: boolean;
  onRemove: (id: number) => void;
  onToggleLock: (id: number, locked: boolean) => void;
}

function StopCard({ stop, index, isLocked, onRemove, onToggleLock }: StopCardProps) {
  const order = stop.order;
  const canDrag = !isLocked && !stop.is_locked;

  return (
    <Draggable draggableId={String(stop.id)} index={index} isDragDisabled={!canDrag}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style as React.CSSProperties}
          className={`bg-white rounded border p-2.5 text-xs ${
            snapshot.isDragging ? 'shadow-lg border-blue-400' : 'border-gray-200'
          } ${stop.is_locked ? 'border-orange-300 bg-orange-50' : ''}`}
        >
          <div className="flex items-start gap-2">
            {canDrag && (
              <div {...provided.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            {stop.is_locked && <Lock className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />}

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-700">#{stop.stop_sequence}</span>
                <span className={`px-1.5 py-0.5 rounded-full ${STATUS_COLORS[order?.status ?? 'pending']}`}>
                  {order?.status?.replace('_', ' ')}
                </span>
              </div>
              <p className="font-medium truncate">{order?.customer_name}</p>
              <p className="text-gray-400 truncate">{order?.delivery_address?.substring(0, 35)}...</p>
              {order?.requested_delivery_start && (
                <p className="text-blue-500 mt-0.5">
                  ⏰ {formatTime(order.requested_delivery_start)}–{formatTime(order.requested_delivery_end)}
                </p>
              )}
              <div className="flex justify-between items-center mt-1.5">
                {order?.customer && (
                  <span className={`px-1.5 py-0.5 rounded-full ${VIP_COLORS[order.customer.vip_level ?? 'standard']}`}>
                    {order.customer.vip_level}
                  </span>
                )}
                <span className="text-gray-400 ml-auto">Score: {Math.round(stop.total_score)}</span>
              </div>
            </div>

            {!isLocked && (
              <div className="flex flex-col gap-1">
                <button
                  className="text-gray-300 hover:text-orange-400"
                  onClick={() => onToggleLock(stop.id, !stop.is_locked)}
                  title={stop.is_locked ? 'Unlock stop' : 'Lock stop position'}
                >
                  <Lock className="h-3 w-3" />
                </button>
                <button
                  className="text-gray-300 hover:text-red-500"
                  onClick={() => { if (confirm('Remove this stop?')) onRemove(stop.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
