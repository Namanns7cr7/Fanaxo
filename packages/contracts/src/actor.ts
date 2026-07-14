/**
 * Authenticated actor contract.
 *
 * An Actor is what a session resolves to on the server. Authorization
 * decisions take an Actor, never raw request fields, so role and venue
 * scope can only originate from the session store (spec 07 §4).
 */

import { z } from 'zod';

import { UserRole, VolunteerRoleType } from './enums.js';

const uuid = z.string().uuid();

export const FanActorSchema = z.object({
  kind: z.literal(UserRole.FAN),
  sessionId: uuid,
  venueId: uuid,
  ticketId: uuid.nullable(),
});

export const VolunteerActorSchema = z.object({
  kind: z.literal(UserRole.VOLUNTEER),
  sessionId: uuid,
  userId: uuid,
  venueId: uuid,
  zoneId: uuid,
  roleType: z.nativeEnum(VolunteerRoleType),
  displayName: z.string(),
});

export const OperatorActorSchema = z.object({
  kind: z.literal(UserRole.OPERATOR),
  sessionId: uuid,
  userId: uuid,
  venueId: uuid,
  displayName: z.string(),
});

export const ActorSchema = z.discriminatedUnion('kind', [
  FanActorSchema,
  VolunteerActorSchema,
  OperatorActorSchema,
]);

export type FanActor = z.infer<typeof FanActorSchema>;
export type VolunteerActor = z.infer<typeof VolunteerActorSchema>;
export type OperatorActor = z.infer<typeof OperatorActorSchema>;
export type Actor = z.infer<typeof ActorSchema>;
