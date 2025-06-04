'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportWizard } from '@/components/report/ReportWizard';
import { useReports } from '@/lib/hooks/use-reports';

export default function NewReportPage() {
  const router = useRouter();
  const { createReport } = useReports();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateReport = async (reportData: {
    title: string;
    topic: string;
    reportType: string;
    academicLevel: string;
    fieldOfStudy?: string;
    wordLimit?: number;
    customSections?: string[];
  }) => {
    setIsCreating(true);
    try {
      const report = await createReport(reportData);
      router.push(`/reports/${report.id}/edit`);
    } catch (error) {
      console.error('Failed to create report:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Report</h1>
          <p className="text-gray-600 mt-2">
            Set up your research report with our guided wizard
          </p>
        </div>

        <ReportWizard
          onSubmit={handleCreateReport}
          isLoading={isCreating}
          onCancel={() => router.push('/reports')}
        />
      </div>
    </div>
  );
}
