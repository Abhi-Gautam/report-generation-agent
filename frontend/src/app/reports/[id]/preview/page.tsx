'use client';

import { useParams } from 'next/navigation';
import { PDFPreview } from '@/components/report/PDFPreview';
import { useReports } from '@/lib/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Edit3 } from 'lucide-react';
import Link from 'next/link';

export default function PreviewReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const { report, isLoading } = useReports(reportId);

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Authentication required');
        return;
      }

      const response = await fetch(`/api/projects/${reportId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.title || 'report'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{report?.title}</h1>
            <p className="text-sm text-muted-foreground">Preview Mode</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/reports/${reportId}/edit`}>
            <Button size="sm" variant="outline">
              <Edit3 className="w-4 h-4 mr-1" />
              Edit Report
            </Button>
          </Link>
          
          <Button size="sm" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-1" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* PDF Preview */}
      <div className="flex-1 bg-muted">
        <PDFPreview reportId={reportId} />
      </div>
    </div>
  );
}
