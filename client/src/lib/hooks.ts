import type { Merchant } from '@night-market/shared';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from './api';

/** The signed-in merchant, or `null` when nobody is signed in. */
export function useMe(): UseQueryResult<Merchant | null> {
  return useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: Infinity });
}

/** The signed-in merchant. Only use below <RequireAuth>, which guarantees one exists. */
export function useMerchant(): Merchant {
  const { data } = useMe();
  if (!data) throw new Error('useMerchant() must be used inside <RequireAuth>.');
  return data;
}

export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(async () => {
    await api.logout().catch(() => undefined);
    queryClient.clear();
    queryClient.setQueryData(['me'], null);
    navigate('/login', { replace: true });
  }, [queryClient, navigate]);
}

export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · Night Market` : 'Night Market';
  }, [title]);
}
