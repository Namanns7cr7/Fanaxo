import { describe, expect, it } from 'vitest';

import { GateStatus } from './enums.js';
import { EventType, parseRealtimeEvent } from './events.js';

const VENUE_ID = '00000000-0000-4000-8000-000000000001';
const GATE_ID = '00000000-0000-4000-8000-000000000002';

function validGateEvent(): unknown {
  return {
    eventId: '00000000-0000-4000-8000-000000000010',
    eventType: EventType.GATE_STATE_CHANGED,
    schemaVersion: 1,
    venueId: VENUE_ID,
    aggregateId: GATE_ID,
    aggregateVersion: 3,
    occurredAt: '2026-07-15T17:00:00.000Z',
    correlationId: '00000000-0000-4000-8000-000000000011',
    payload: {
      gateId: GATE_ID,
      venueId: VENUE_ID,
      name: 'Gate C',
      status: GateStatus.RESTRICTED,
      queueMinutes: 12,
      throughput: 40,
      currentCount: 180,
      capacity: 200,
      version: 3,
      updatedAt: '2026-07-15T17:00:00.000Z',
    },
  };
}

describe('parseRealtimeEvent', () => {
  it('parses a valid event with a typed payload', () => {
    const event = parseRealtimeEvent(validGateEvent());
    expect(event).not.toBeNull();
    expect(event?.eventType).toBe(EventType.GATE_STATE_CHANGED);
    if (event?.eventType === EventType.GATE_STATE_CHANGED) {
      expect(event.payload.status).toBe(GateStatus.RESTRICTED);
    }
  });

  it('returns null for a malformed envelope instead of throwing', () => {
    expect(parseRealtimeEvent(null)).toBeNull();
    expect(parseRealtimeEvent('garbage')).toBeNull();
    expect(parseRealtimeEvent({})).toBeNull();
    const missingVenue = { ...(validGateEvent() as Record<string, unknown>) };
    delete missingVenue['venueId'];
    expect(parseRealtimeEvent(missingVenue)).toBeNull();
  });

  it('returns null when the payload does not match the event type schema', () => {
    const event = { ...(validGateEvent() as Record<string, unknown>), payload: { bogus: true } };
    expect(parseRealtimeEvent(event)).toBeNull();
  });

  it('rejects unknown event types', () => {
    const event = {
      ...(validGateEvent() as Record<string, unknown>),
      eventType: 'gate.exploded',
    };
    expect(parseRealtimeEvent(event)).toBeNull();
  });
});
