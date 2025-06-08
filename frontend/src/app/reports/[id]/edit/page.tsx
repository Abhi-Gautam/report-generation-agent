'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SectionNavigator } from '@/components/report/SectionNavigator';
import { ContentEditor } from '@/components/report/ContentEditor';
import { PDFPreview } from '@/components/report/PDFPreview';
import { useReportSections } from '@/lib/hooks/use-report-sections';
import { useReports } from '@/lib/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Eye, Edit3, Save, Download } from 'lucide-react';

type ViewMode = 'edit' | 'preview';

export default function EditReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { report, isLoading: isLoadingReport } = useReports(reportId);
  const { 
    sections, 
    isLoading: isLoadingSections, 
    updateSection, 
    reorderSections,
    isUpdating
  } = useReportSections(reportId);

  useEffect(() => {
    if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  const selectedSection = sections.find((s: any) => s.id === selectedSectionId);

  const handleSectionSelect = (sectionId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to switch sections?')) {
        return;
      }
    }
    setSelectedSectionId(sectionId);
    setHasUnsavedChanges(false);
  };

  const handleContentChange = async (content: string) => {
    if (selectedSection) {
      setHasUnsavedChanges(true);
      await updateSection({ sectionId: selectedSection.id, updates: { content } });
      setHasUnsavedChanges(false);
    }
  };

  const handleSectionReorder = async (sectionOrders: { id: string; order: number }[]) => {
    await reorderSections(sectionOrders);
  };

  if (isLoadingReport || isLoadingSections) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 border-border">
        <div>
          <h1 className="text-xl font-semibold">{report?.title}</h1>
          <p className="text-sm text-muted-foreground">{report?.topic}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('edit')}
              className="rounded-none"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="rounded-none"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
          </div>
          
          <Button size="sm" variant="outline">
            <Save className="w-4 h-4 mr-1" />
            {hasUnsavedChanges ? 'Save*' : 'Saved'}
          </Button>
          
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - Section Navigator */}
        <div className="w-80 border-r bg-muted/50 overflow-y-auto border-border">
          <SectionNavigator
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSectionSelect={handleSectionSelect}
            onSectionReorder={handleSectionReorder}
            reportId={reportId}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {viewMode === 'edit' ? (
            <div className="flex-1 flex flex-col">
              <ContentEditor
                section={selectedSection}
                onContentChange={handleContentChange}
                isUpdating={isUpdating}
              />
            </div>
          ) : (
            <div className="flex-1">
              <PDFPreview reportId={reportId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
