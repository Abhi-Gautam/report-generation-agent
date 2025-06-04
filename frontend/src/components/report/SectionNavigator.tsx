'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Table, BarChart3, Image } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  type: string;
  order: number;
  content: string;
  metadata?: any;
}

interface SectionNavigatorProps {
  sections: Section[];
  selectedSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
  onSectionReorder: (sectionOrders: { id: string; order: number }[]) => void;
  reportId: string;
}

const sectionTypeIcons = {
  TEXT: FileText,
  TABLE: Table,
  CHART: BarChart3,
  FIGURE: Image,
  CODE: FileText
};

export function SectionNavigator({
  sections,
  selectedSectionId,
  onSectionSelect,
  onSectionReorder,
  reportId
}: SectionNavigatorProps) {
  const [isReordering, setIsReordering] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    
    const reorderedSections = [...sections];
    const [removed] = reorderedSections.splice(oldIndex, 1);
    reorderedSections.splice(newIndex, 0, removed);
    
    const sectionOrders = reorderedSections.map((section, index) => ({
      id: section.id,
      order: index + 1
    }));
    
    onSectionReorder(sectionOrders);
  };

  const addNewSection = () => {
    // This would trigger a modal or form to add a new section
    console.log('Add new section');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Sections</h2>
          <Button size="sm" onClick={addNewSection}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((section) => {
              const IconComponent = sectionTypeIcons[section.type as keyof typeof sectionTypeIcons] || FileText;
              
              return (
                <SortableItem
                  key={section.id}
                  id={section.id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors border ${
                    selectedSectionId === section.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onSectionSelect(section.id)}
                >
                  <div className="flex items-start gap-3">
                    <IconComponent className={`w-4 h-4 mt-0.5 ${
                      selectedSectionId === section.id ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm line-clamp-2 ${
                        selectedSectionId === section.id ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {section.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {section.type.toLowerCase()} • {section.content.length} chars
                      </p>
                    </div>
                  </div>
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
