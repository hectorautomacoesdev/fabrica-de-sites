import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { BusinessFilters, RunStartRequest } from '../api/client'

export function useRuns(limit = 20) {
  return useQuery({
    queryKey: ['runs', limit],
    queryFn: () => api.listRuns(limit),
    staleTime: 30_000,
  })
}

export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: () => api.listSectors(),
    staleTime: Infinity,  // taxonomia é estática durante a sessão
  })
}

export function useInsights(runId: number | null) {
  return useQuery({
    queryKey: ['insights', runId],
    queryFn: () => api.getInsights(runId!),
    enabled: runId !== null,
    staleTime: 60_000,
  })
}

export function useBusinesses(runId: number | null, filters: BusinessFilters = {}) {
  return useQuery({
    queryKey: ['businesses', runId, filters],
    queryFn: () => api.getBusinesses(runId!, filters),
    enabled: runId !== null,
    staleTime: 60_000,
  })
}

/** Versão paginada (server-side): devolve { items, total }. Mantém a página
 *  anterior visível enquanto a próxima carrega (sem "piscar"). */
export function useBusinessesPaged(runId: number | null, filters: BusinessFilters = {}) {
  return useQuery({
    queryKey: ['businesses-paged', runId, filters],
    queryFn: () => api.getBusinessesPaged(runId!, filters),
    enabled: runId !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function useStartRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RunStartRequest) => api.startRun(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['runs'] })
    },
  })
}
