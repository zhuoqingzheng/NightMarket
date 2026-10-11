import type { StallChange } from '@night-market/shared';
import type { Response } from 'express';

/**
 * Server-sent events: every merchant viewing an event's floor plan holds an open stream,
 * and any booking change is pushed to them immediately.
 */
const audiences = new Map<number, Set<Response>>();

export function openStream(res: Response, eventId: number): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  const audience = audiences.get(eventId) ?? new Set<Response>();
  audiences.set(eventId, audience);
  audience.add(res);

  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25_000);

  res.on('close', () => {
    clearInterval(heartbeat);
    audience.delete(res);
    if (audience.size === 0) audiences.delete(eventId);
  });
}

export function broadcastStallChange(eventId: number, change: Omit<StallChange, 'at'>): void {
  const audience = audiences.get(eventId);
  if (!audience) return;
  const data: StallChange = { ...change, at: Date.now() };
  const message = `event: stalls\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of audience) res.write(message);
}
