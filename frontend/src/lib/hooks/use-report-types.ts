import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api';

export interface ReportTypeOption {
  value: string;
  label: string;
  description: string;
  category: 'academic' | 'professional' | 'scientific' | 'business';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: [number, number];
}

export interface ReportTypeConfig {
  id: string;
  label: string;
  description: string;
  longDescription: string;
  enabled: boolean;
  category: 'academic' | 'professional' | 'scientific' | 'business';
  template: {
    sections: Array<{
      id: string;
      title: string;
      type: 'TEXT' | 'CODE' | 'MATH' | 'TABLE' | 'FIGURE';
      description: string;
      wordCountRange: [number, number];
      required: boolean;
      order: number;
      subsections?: string[];
      guidelines?: string;
    }>;
    metadata: {
      wordCountRange: [number, number];
      defaultCitationStyle: 'APA' | 'MLA' | 'CHICAGO' | 'IEEE';
      recommendedAcademicLevels: string[];
      estimatedTimeHours: [number, number];
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      tags: string[];
    };
    latexTemplate: {
      documentClass: string;
      packages: string[];
      preamble: string;
      titlePageTemplate: string;
      sectionTemplate: string;
      bibliographyTemplate: string;
    };
  };
  examples: Array<{
    title: string;
    description: string;
    fieldOfStudy?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  version: string;
}

// Hook to get report type options for dropdowns
export function useReportTypes() {
  return useQuery({
    queryKey: ['reportTypes'],
    queryFn: async (): Promise<ReportTypeOption[]> => {
      const response = await authApi.get('/report-types');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook to get full configuration for all report types
export function useReportTypesConfig() {
  return useQuery({
    queryKey: ['reportTypesConfig'],
    queryFn: async (): Promise<ReportTypeConfig[]> => {
      const response = await authApi.get('/report-types/full');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook to get specific report type configuration
export function useReportTypeConfig(reportTypeId: string | null) {
  return useQuery({
    queryKey: ['reportTypeConfig', reportTypeId],
    queryFn: async (): Promise<ReportTypeConfig> => {
      if (!reportTypeId) throw new Error('Report type ID is required');
      const response = await authApi.get(`/report-types/${reportTypeId}`);
      return response.data.data;
    },
    enabled: !!reportTypeId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook to get template configuration for a specific report type
export function useReportTypeTemplate(reportTypeId: string | null) {
  return useQuery({
    queryKey: ['reportTypeTemplate', reportTypeId],
    queryFn: async (): Promise<{ id: string; template: ReportTypeConfig['template'] }> => {
      if (!reportTypeId) throw new Error('Report type ID is required');
      const response = await authApi.get(`/report-types/${reportTypeId}/template`);
      return response.data.data;
    },
    enabled: !!reportTypeId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Utility functions
export function getReportTypeById(reportTypes: ReportTypeOption[], id: string): ReportTypeOption | undefined {
  return reportTypes.find(type => type.value === id);
}

export function getReportTypesByCategory(reportTypes: ReportTypeOption[], category: string): ReportTypeOption[] {
  return reportTypes.filter(type => type.category === category);
}

export function getReportTypesByDifficulty(reportTypes: ReportTypeOption[], difficulty: string): ReportTypeOption[] {
  return reportTypes.filter(type => type.difficulty === difficulty);
}