import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Subscribes to an event's live stream. Whenever any merchant books, switches or cancels,
 * the floor plan is refetched so everyone sees the same map within a moment.
 * Returns whether the live connection is currently up.
 */
export function useEventLive(slug: string): boolean {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const source = new EventSource(`/api/events/${encodeURIComponent(slug)}/live`);
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['event', slug] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    };

    source.addEventListener('open', () => {
      setConnected(true);
      refresh();
    });
    source.addEventListener('error', () => setConnected(false));
    source.addEventListener('stalls', refresh);

    return () => {
      source.close();
      setConnected(false);
    };
  }, [queryClient, slug]);

  return connected;
}
