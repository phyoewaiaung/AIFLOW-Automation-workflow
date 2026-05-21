import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflows as workflowApi, executions, analytics, agents } from '@/lib/api';
import { useToastStore } from '@/store/use-toast-store';

function onMutationError(err: Error) {
  useToastStore.getState().addToast(err.message, 'error');
}

export function useWorkflows(organizationId: string) {
  return useQuery({
    queryKey: ['workflows', organizationId],
    queryFn: () => workflowApi.list(organizationId),
    enabled: !!organizationId,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowApi.get(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; organizationId: string }) =>
      workflowApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflows', variables.organizationId] });
    },
    onError: onMutationError,
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      workflowApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', data.id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: onMutationError,
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: onMutationError,
  });
}

export function useActivateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowApi.activate(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['workflows'] });
      queryClient.setQueriesData({ queryKey: ['workflows'] }, (old: any) =>
        old?.map((w: any) => (w.id === id ? { ...w, active: true } : w))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: onMutationError,
  });
}

export function useDeactivateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowApi.deactivate(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['workflows'] });
      queryClient.setQueriesData({ queryKey: ['workflows'] }, (old: any) =>
        old?.map((w: any) => (w.id === id ? { ...w, active: false } : w))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: onMutationError,
  });
}

export function useSaveWorkflowNodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nodes: any[]; edges: any[] } }) =>
      workflowApi.saveNodes(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', data.id] });
    },
    onError: onMutationError,
  });
}

export function useExecutions(organizationId: string, filters?: { workflowId?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['executions', organizationId, filters],
    queryFn: () => executions.list(organizationId, filters),
    enabled: !!organizationId,
  });
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: ['execution', id],
    queryFn: () => executions.get(id),
    enabled: !!id,
  });
}

export function useExecutionLogs(executionId: string) {
  return useQuery({
    queryKey: ['execution-logs', executionId],
    queryFn: () => executions.getLogs(executionId),
    enabled: !!executionId,
  });
}

export function useTriggerExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowId, data }: { workflowId: string; data?: any }) =>
      executions.trigger(workflowId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
    onError: onMutationError,
  });
}

export function useCancelExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => executions.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
    onError: onMutationError,
  });
}

export function useRetryExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => executions.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
    onError: onMutationError,
  });
}

export function useAnalytics(organizationId: string) {
  return useQuery({
    queryKey: ['analytics', organizationId],
    queryFn: () => analytics.overview(organizationId),
    enabled: !!organizationId,
  });
}

export function useAgents(organizationId: string) {
  return useQuery({
    queryKey: ['agents', organizationId],
    queryFn: () => agents.list(organizationId),
    enabled: !!organizationId,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => agents.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.organizationId] });
    },
    onError: onMutationError,
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      agents.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: onMutationError,
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: onMutationError,
  });
}
