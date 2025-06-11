'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// PDF.js setup with version 5.3.31
const setupPDFJS = async () => {
  if (typeof window === 'undefined') return null;
  
  // Import pdfjs-dist version 5.3.31
  const pdfjs = await import('pdfjs-dist');
  
  // Use the exact worker version that matches
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';
  
  console.log(`PDF.js version: ${pdfjs.version}, Worker: 5.3.31`);
  return pdfjs;
};

interface PDFPreviewProps {
  reportId: string;
}

export function PDFPreview({ reportId }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

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
        setPageNumber(1);
        
        console.log(`PDF loaded successfully with ${pdfDoc.numPages} pages`);
        
        // Force initial render of first page to avoid upside down issue
        setTimeout(() => {
          if (canvasRef.current && pdfDoc) {
            renderPageDirect(pdfDoc, 1);
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
    if (pdf && pageNumber) {
      renderPage(pageNumber);
    }
  }, [pdf, pageNumber, scale]);

  const renderPageDirect = async (pdfDoc: any, pageNum: number) => {
    if (!canvasRef.current) return;

    try {
      // Cancel previous render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ 
        scale,
        rotation: 0 // Ensure no rotation on first render
      });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Clear canvas completely
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      // Store render task for cancellation
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;
      
    } catch (error) {
      if (error.name === 'RenderingCancelledException') {
        console.log('Direct rendering was cancelled');
      } else {
        console.error('Error in direct rendering:', error);
      }
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdf || !canvasRef.current) return;
    await renderPageDirect(pdf, pageNum);
  };

  const handleRecompile = async () => {
    setIsCompiling(true);
    setPdf(null);
    setNumPages(0);
    setPageNumber(1);
    
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

  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.3, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.3, 0.5));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
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
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 px-2">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
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

      {/* PDF Viewer */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto p-4">
        {pdf ? (
          <div className="bg-white shadow-lg">
            <canvas
              ref={canvasRef}
              className="block max-w-full h-auto"
            />
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-500">No PDF available</p>
          </div>
        )}
      </div>
    </div>
  );
}
