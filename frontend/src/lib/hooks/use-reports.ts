import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api';

interface Report {
  id: string;
  title: string;
  topic: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sections?: Section[];
  metadata?: any;
  sessionId?: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
  type: string;
  order: number;
  metadata?: any;
}

export function useReports(reportId?: string) {
  const queryClient = useQueryClient();

  // Fetch all reports
  const {
    data: reports = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await authApi.get('/projects');
      return response.data.data || [];
    },
    enabled: !reportId
  });

  // Fetch single report
  const {
    data: report,
    isLoading: isLoadingReport
  } = useQuery({
    queryKey: ['reports', reportId],
    queryFn: async () => {
      const response = await authApi.get(`/projects/${reportId}`);
      return response.data.data;
    },
    enabled: !!reportId
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (reportData: {
      title: string;
      topic: string;
      reportType: string;
      academicLevel: string;
      fieldOfStudy?: string;
      wordLimit?: number;
      customSections?: string[];
    }) => {
      // First create the project
      const projectResponse = await authApi.post('/projects', {
        title: reportData.title,
        topic: reportData.topic,
        metadata: {
          reportType: reportData.reportType,
          academicLevel: reportData.academicLevel,
          fieldOfStudy: reportData.fieldOfStudy,
          wordLimit: reportData.wordLimit
        }
      });

      const project = projectResponse.data.data;

      // Small delay to ensure project is fully created
      await new Promise(resolve => setTimeout(resolve, 500));

      // Start AI research generation immediately with PDF compilation
      const generationResponse = await authApi.post(`/projects/${project.id}/generate`, {
        options: {
          includeImages: true,  // Enable PDF generation
          maxSources: 5,
          citationStyle: 'APA'
        }
      });

      return {
        ...project,
        sessionId: generationResponse.data.data.sessionId
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await authApi.delete(`/projects/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  return {
    reports,
    report: reportId ? report : undefined,
    isLoading: reportId ? isLoadingReport : isLoading,
    error,
    createReport: createReportMutation.mutateAsync,
    deleteReport: deleteReportMutation.mutateAsync,
    isCreating: createReportMutation.isPending,
    isDeleting: deleteReportMutation.isPending
  };
}
