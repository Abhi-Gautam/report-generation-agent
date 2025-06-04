'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SortableItem({ id, children, className, onClick }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${className} ${isDragging ? 'z-10' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="mr-2 p-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
