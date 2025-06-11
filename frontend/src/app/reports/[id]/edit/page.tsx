'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SectionNavigator } from '@/components/report/SectionNavigator';
import { ContentEditor } from '@/components/report/ContentEditor';
import { PDFPreview } from '@/components/report/PDFPreview';
import { useReportSections } from '@/lib/hooks/use-report-sections';
import { useReports } from '@/lib/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Eye, Edit3, Download, Split } from 'lucide-react';

type ViewMode = 'edit' | 'preview' | 'split';

export default function EditReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [splitWidth, setSplitWidth] = useState(50); // Percentage for left pane
  const [isDragging, setIsDragging] = useState(false);

  // Reset split width when entering split mode
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'split') {
      setSplitWidth(50); // Reset to 50-50 split
    }
    setViewMode(mode);
  };

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

  // Responsive handling - switch to edit mode on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'split') {
        handleViewModeChange('edit');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Handle split resizer drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.querySelector('.split-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Constrain between 10% and 90% for better usability
    const constrainedWidth = Math.max(10, Math.min(90, newWidth));
    setSplitWidth(constrainedWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const selectedSection = sections.find((s: any) => s.id === selectedSectionId);

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSectionId(sectionId);
  };

  const handleContentChange = async (content: string) => {
    if (selectedSection) {
      await updateSection({ sectionId: selectedSection.id, updates: { content } });
    }
  };

  const handleSectionReorder = async (sectionOrders: { id: string; order: number }[]) => {
    await reorderSections(sectionOrders);
  };


  const handleExport = async () => {
    const exportType = prompt('Choose export format:\n1. PDF\n2. LaTeX\n\nEnter 1 or 2:');
    
    if (!exportType || !['1', '2'].includes(exportType)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Authentication required');
        return;
      }

      let url = '';
      let filename = '';
      
      if (exportType === '1') {
        // PDF export
        url = `/api/projects/${reportId}/download`;
        filename = `${report?.title || 'report'}.pdf`;
      } else {
        // LaTeX export
        url = `/api/sections/${reportId}/download/latex`;
        filename = `${report?.title || 'report'}.tex`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export document');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export document. Please try again.');
    }
  };

  if (isLoadingReport || isLoadingSections) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur-sm border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">{report?.title}</h1>
          <p className="text-sm text-muted-foreground">{report?.topic}</p>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex rounded-lg overflow-hidden border">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('edit')}
              className="rounded-none"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('split')}
              className="rounded-none hidden md:flex"
              disabled={typeof window !== 'undefined' && window.innerWidth < 768}
            >
              <Split className="w-4 h-4 mr-1" />
              Split
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('preview')}
              className="rounded-none"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
          </div>
          
          
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
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
          ) : viewMode === 'split' ? (
            <div className="flex-1 flex split-container relative">
              {/* Split View: Editor on left, PDF on right */}
              <div 
                className="flex flex-col min-h-0 overflow-hidden"
                style={{ width: `${splitWidth}%` }}
              >
                {splitWidth < 25 ? (
                  // Collapsed editor tab
                  <div className="flex items-center justify-center h-full bg-muted/50 border-r border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSplitWidth(50)}
                      className="rotate-90 whitespace-nowrap"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Editor
                    </Button>
                  </div>
                ) : (
                  <div className="h-full overflow-x-auto overflow-y-hidden">
                    <ContentEditor
                      section={selectedSection}
                      onContentChange={handleContentChange}
                      isUpdating={isUpdating}
                    />
                  </div>
                )}
              </div>
              
              {/* Resizer */}
              <div
                className="w-1 bg-border hover:bg-primary cursor-col-resize flex-shrink-0 relative group z-10"
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-primary/20"></div>
                <div className="absolute inset-y-0 left-0 w-1 bg-border group-hover:bg-primary"></div>
              </div>
              
              <div 
                className="flex flex-col min-h-0 overflow-hidden"
                style={{ width: `${100 - splitWidth}%` }}
              >
                {(100 - splitWidth) < 25 ? (
                  // Collapsed PDF tab
                  <div className="flex items-center justify-center h-full bg-muted/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSplitWidth(50)}
                      className="rotate-90 whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                ) : (
                  <div className="h-full overflow-x-auto overflow-y-hidden">
                    <PDFPreview 
                      reportId={reportId} 
                      selectedSectionId={selectedSectionId}
                      sections={sections}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <PDFPreview 
                reportId={reportId} 
                sections={sections}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
