'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

// PDF.js setup - Use dynamic import only on client side
const setupPDFJS = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Import pdfjs-dist version 5.3.31
    const pdfjs = await import('pdfjs-dist');
    
    // Use the exact worker version that matches
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';
    
    console.log(`PDF.js version: ${pdfjs.version}, Worker: 5.3.31`);
    return pdfjs;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    return null;
  }
};

interface PDFPreviewProps {
  reportId: string;
  selectedSectionId?: string | null;
  sections?: Array<{ id: string; title: string; }>;
}

export function PDFPreview({ reportId, selectedSectionId, sections }: PDFPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTasksRef = useRef<any[]>([]);
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  const [renderedPages, setRenderedPages] = useState<HTMLCanvasElement[]>([]);

  const loadPDF = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Checking for existing PDF...');
      
      // FIRST: Check if PDF already exists - DO NOT trigger research
      const pdfResponse = await fetch(`/api/projects/${reportId}/download?view=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (pdfResponse.ok) {
        console.log('Found existing PDF, loading...');
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        
        // Initialize PDF.js and load the document
        const pdfjs = await setupPDFJS();
        if (!pdfjs) {
          throw new Error('Failed to initialize PDF.js');
        }

        const pdfDoc = await pdfjs.getDocument({ data: pdfArrayBuffer }).promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        
        console.log(`PDF loaded successfully with ${pdfDoc.numPages} pages`);
        
        // Render all pages for vertical scrolling
        setTimeout(() => {
          if (pdfDoc) {
            renderAllPages(pdfDoc);
          }
        }, 100);
      } else if (pdfResponse.status === 404) {
        // PDF doesn't exist - show message instead of auto-generating
        setError('No PDF available. Please generate the report first from the edit page.');
      } else {
        throw new Error(`Failed to load PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
      console.error('PDF loading error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPDF();
  }, [reportId]);

  useEffect(() => {
    if (pdf && numPages > 0) {
      renderAllPages(pdf);
    }
  }, [pdf, numPages, scale]);

  // Navigate to section when selectedSectionId changes
  useEffect(() => {
    if (selectedSectionId && pdf && containerRef.current) {
      findAndNavigateToSection(selectedSectionId);
    }
  }, [selectedSectionId, pdf]);

  const findAndNavigateToSection = async (sectionId: string) => {
    if (!pdf || !containerRef.current) return;
    
    try {
      // Get section title from the sections data (need to pass this as prop)
      // For now, extract from sectionId or use a mapping
      const sectionTitle = getSectionTitleFromId(sectionId);
      if (!sectionTitle) return;

      console.log('Searching for section:', sectionTitle);

      // Search through all pages for the section title
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str).join(' ');
        
        // Check if this page contains the section title
        if (textItems.toLowerCase().includes(sectionTitle.toLowerCase())) {
          console.log(`Found section "${sectionTitle}" on page ${pageNum}`);
          
          // Scroll to this page
          const pageElement = containerRef.current.querySelector(`[data-page="${pageNum}"]`);
          if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error searching for section:', error);
    }
  };

  const getSectionTitleFromId = (sectionId: string): string | null => {
    if (!sections) return null;
    const section = sections.find(s => s.id === sectionId);
    return section ? section.title : null;
  };

  const renderAllPages = async (pdfDoc: any) => {
    if (!containerRef.current) return;

    try {
      // Cancel previous render tasks
      renderTasksRef.current.forEach(task => {
        if (task) task.cancel();
      });
      renderTasksRef.current = [];

      // Clear container
      containerRef.current.innerHTML = '';
      
      const pages: HTMLCanvasElement[] = [];

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ 
          scale,
          rotation: 0
        });
        
        // Create canvas for this page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.dataset.page = pageNum.toString();
        canvas.className = 'block mx-auto mb-4 shadow-lg bg-white';

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        // Store render task for cancellation
        const renderTask = page.render(renderContext);
        renderTasksRef.current.push(renderTask);
        
        await renderTask.promise;
        
        containerRef.current?.appendChild(canvas);
        pages.push(canvas);
      }
      
      setRenderedPages(pages);
      
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering pages:', error);
      }
    }
  };

  const handleRecompile = async () => {
    setIsCompiling(true);
    setPdf(null);
    setNumPages(0);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Trigger LaTeX recompilation only (not research)
      const compileResponse = await fetch(`/api/projects/${reportId}/compile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!compileResponse.ok) {
        throw new Error('Failed to start recompilation');
      }

      // Wait a bit and then reload the PDF
      setTimeout(() => {
        loadPDF();
      }, 3000);
      
    } catch (error) {
      console.error('Recompilation failed:', error);
      setError('Failed to recompile PDF');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/projects/${reportId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={loadPDF}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.3, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.3, 0.5));
  };

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white border-border min-w-[200px] overflow-x-auto">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleZoomOut} disabled={!pdf}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {Math.round(scale * 100)}%
          </span>
          <Button size="sm" variant="outline" onClick={handleZoomIn} disabled={!pdf}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {numPages > 0 && (
            <span className="text-sm text-gray-600 px-2">
              {numPages} page{numPages !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRecompile}
            disabled={isCompiling}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isCompiling ? 'animate-spin' : ''}`} />
            {isCompiling ? 'Recompiling...' : 'Recompile'}
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Viewer - Vertically Scrollable */}
      <div className="flex-1 bg-gray-100 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
        {pdf ? (
          <div 
            ref={containerRef}
            className="max-w-full"
          >
            {/* Pages will be rendered here dynamically */}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">No PDF available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}