'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Calendar, Eye, Edit3, Download, Trash2, Archive, MoreVertical, FileType, X } from 'lucide-react';
import { useReports } from '@/lib/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/lib/hooks/use-toast';

export default function ReportsPage() {
  const router = useRouter();
  const { reports, isLoading, deleteReport, isDeleting } = useReports();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quickForm, setQuickForm] = useState({ title: '', topic: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<{id: string, title: string} | null>(null);

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleQuickCreate = async () => {
    if (!quickForm.title.trim() || !quickForm.topic.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both title and topic",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          title: quickForm.title,
          topic: quickForm.topic,
          reportType: 'research_paper',
          academicLevel: 'undergraduate',
          wordLimit: 5000
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create report');
      }

      const data = await response.json();
      router.push(`/research/${data.projectId}/generate`);
    } catch (error) {
      toast({
        title: "Creation failed",
        description: "Failed to create report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
      setQuickForm({ title: '', topic: '' });
    }
  };

  const handleEditReport = (reportId: string) => {
    router.push(`/reports/${reportId}/edit`);
  };

  const handlePreviewReport = (reportId: string) => {
    router.push(`/reports/${reportId}/preview`);
  };

  const handleDownloadPDF = async (reportId: string, reportTitle: string) => {
    try {
      // Try with proxy first, fallback to direct backend URL
      let response;
      try {
        response = await fetch(`/api/projects/${reportId}/download`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
      } catch (error) {
        // Fallback to direct backend URL
        response = await fetch(`http://localhost:4000/api/projects/${reportId}/download`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
      }

      if (!response.ok) {
        throw new Error('PDF not available');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${reportTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF downloaded",
        description: `"${reportTitle}.pdf" has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "PDF not available yet. Try generating the report first.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteReport = (reportId: string, reportTitle: string) => {
    setReportToDelete({ id: reportId, title: reportTitle });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    
    setDeletingReportId(reportToDelete.id);
    try {
      await deleteReport(reportToDelete.id);
      toast({
        title: "Report deleted",
        description: `"${reportToDelete.title}" has been permanently deleted.`,
      });
      setSelectedReport(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete the report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingReportId(null);
      setShowDeleteModal(false);
      setReportToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Research Reports</h1>
          <p className="text-gray-600 mt-2">
            Create, edit, and manage your research reports
          </p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Report
        </Button>
      </div>

      {/* Reports Grid */}
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reports yet
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first research report
          </p>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Report
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report: any) => (
            <Card 
              key={report.id} 
              className={`group p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 ${
                selectedReport === report.id ? 'border-blue-500' : 'border-transparent'
              }`}
              onClick={() => setSelectedReport(report.id === selectedReport ? null : report.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    report.status === 'COMPLETED' 
                      ? 'bg-green-100 text-green-800'
                      : report.status === 'DRAFT'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {report.status.toLowerCase()}
                  </span>
                  {/* PDF Available Indicator */}
                  {report.status === 'COMPLETED' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      <FileType className="w-3 h-3" />
                      <span>PDF</span>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {report.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {report.topic}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(report.updatedAt)}
                </div>
              </div>

              {selectedReport === report.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditReport(report.id);
                      }}
                      className="flex-1"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewReport(report.id);
                      }}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(report.id, report.title);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report.id, report.title);
                      }}
                      disabled={deletingReportId === report.id}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingReportId === report.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Quick Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Create New Report</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Report Title *
                </label>
                <input
                  type="text"
                  value={quickForm.title}
                  onChange={(e) => setQuickForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter your report title"
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Research Topic *
                </label>
                <textarea
                  value={quickForm.topic}
                  onChange={(e) => setQuickForm(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="Describe what your report will cover"
                  rows={3}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Default settings will be used:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Research Paper format</li>
                  <li>Undergraduate level</li>
                  <li>5,000 word target</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickCreate}
                disabled={isCreating || !quickForm.title.trim() || !quickForm.topic.trim()}
              >
                {isCreating ? 'Creating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && reportToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-destructive">Delete Report</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-foreground">
                Are you sure you want to permanently delete <strong>"{reportToDelete.title}"</strong>?
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-destructive text-sm font-medium mb-2">This action cannot be undone and will remove:</p>
                <ul className="text-destructive/80 text-sm space-y-1">
                  <li>• All report content and sections</li>
                  <li>• Generated PDFs and files</li>
                  <li>• Research data and citations</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingReportId === reportToDelete.id}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deletingReportId === reportToDelete.id}
              >
                {deletingReportId === reportToDelete.id ? 'Deleting...' : 'Delete Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
