import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // A session can expire while the app is open; drop back to the sign-in screen.
      if (error instanceof ApiError && error.status === 401) {
        queryClient.setQueryData(['me'], null);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
