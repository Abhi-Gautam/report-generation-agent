import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api';

interface Section {
  id: string;
  title: string;
  content: string;
  type: string;
  order: number;
  metadata?: any;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export function useReportSections(reportId: string) {
  const queryClient = useQueryClient();

  // Fetch sections for a report
  const {
    data: sections = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['sections', reportId],
    queryFn: async () => {
      const response = await authApi.get(`/sections/${reportId}`);
      return response.data.data || [];
    },
    enabled: !!reportId
  });

  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: async ({ sectionId, updates }: { 
      sectionId: string; 
      updates: Partial<Section> 
    }) => {
      const response = await authApi.put(`/sections/${reportId}/${sectionId}`, updates);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', reportId] });
    }
  });

  // Create section mutation
  const createSectionMutation = useMutation({
    mutationFn: async (sectionData: {
      title: string;
      content: string;
      type?: string;
      order?: number;
      metadata?: any;
    }) => {
      const response = await authApi.post(`/sections/${reportId}`, sectionData);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', reportId] });
    }
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      await authApi.delete(`/sections/${reportId}/${sectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', reportId] });
    }
  });

  // Reorder sections mutation
  const reorderSectionsMutation = useMutation({
    mutationFn: async (sectionOrders: { id: string; order: number }[]) => {
      const response = await authApi.post(`/sections/${reportId}/reorder`, {
        sectionOrders
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', reportId] });
    }
  });

  return {
    sections,
    isLoading,
    error,
    updateSection: updateSectionMutation.mutateAsync,
    createSection: createSectionMutation.mutateAsync,
    deleteSection: deleteSectionMutation.mutateAsync,
    reorderSections: reorderSectionsMutation.mutateAsync,
    isUpdating: updateSectionMutation.isPending,
    isCreating: createSectionMutation.isPending,
    isDeleting: deleteSectionMutation.isPending,
    isReordering: reorderSectionsMutation.isPending
  };
}
