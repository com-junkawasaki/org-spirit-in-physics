import type { Kysely } from 'kysely';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import type { Database, WebauthnCredentialRow } from '../db/schema';
import { base64urlDecode, base64urlEncode } from './session';

export const RP_NAME = 'Spirit in Physics';
const CHALLENGE_TTL_MS = 1000 * 60 * 5; // 5 minutes

export interface RelyingParty {
  rpID: string;
  origin: string;
}

export function relyingPartyForOrigin(originHeader: string | null | undefined): RelyingParty {
  if (!originHeader) {
    return { rpID: 'localhost', origin: 'http://localhost' };
  }
  let url: URL;
  try {
    url = new URL(originHeader);
  } catch {
    return { rpID: 'localhost', origin: originHeader };
  }
  const host = url.hostname;
  let rpID = host;
  if (host === 'spirit-in-physics.com' || host.endsWith('.spirit-in-physics.com')) {
    rpID = 'spirit-in-physics.com';
  } else if (host === 'localhost' || host === '127.0.0.1') {
    rpID = 'localhost';
  }
  return { rpID, origin: `${url.protocol}//${url.host}` };
}

export async function persistChallenge(
  db: Kysely<Database>,
  challenge: string,
  ceremony: 'registration' | 'authentication',
  userId: string | null,
): Promise<void> {
  const now = Date.now();
  await db
    .insertInto('webauthn_challenges')
    .values({
      id: challenge,
      user_id: userId,
      ceremony,
      expires_at_ms: now + CHALLENGE_TTL_MS,
      created_at_ms: now,
    })
    .execute();
  // best-effort GC of expired challenges
  await db.deleteFrom('webauthn_challenges').where('expires_at_ms', '<', now).execute();
}

export async function consumeChallenge(
  db: Kysely<Database>,
  challenge: string,
  ceremony: 'registration' | 'authentication',
): Promise<{ userId: string | null } | null> {
  const row = await db
    .selectFrom('webauthn_challenges')
    .selectAll()
    .where('id', '=', challenge)
    .where('ceremony', '=', ceremony)
    .executeTakeFirst();
  if (!row) return null;
  await db.deleteFrom('webauthn_challenges').where('id', '=', challenge).execute();
  if (row.expires_at_ms < Date.now()) return null;
  return { userId: row.user_id };
}

export async function generateRegistrationChallenge(
  db: Kysely<Database>,
  rp: RelyingParty,
  user: { id: string; email: string; displayName: string },
  existingCredentialIds: string[],
) {
  const opts: GenerateRegistrationOptionsOpts = {
    rpName: RP_NAME,
    rpID: rp.rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.displayName,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials: existingCredentialIds.map((id) => ({
      id,
      type: 'public-key',
      transports: ['internal', 'hybrid'],
    })),
  };
  const options = await generateRegistrationOptions(opts);
  await persistChallenge(db, options.challenge, 'registration', user.id);
  return options;
}

export async function generateAuthenticationChallenge(
  db: Kysely<Database>,
  rp: RelyingParty,
  allowCredentialIds: string[],
) {
  const opts: GenerateAuthenticationOptionsOpts = {
    rpID: rp.rpID,
    userVerification: 'preferred',
    allowCredentials: allowCredentialIds.map((id) => ({
      id,
      type: 'public-key',
      transports: ['internal', 'hybrid'],
    })),
  };
  const options = await generateAuthenticationOptions(opts);
  await persistChallenge(db, options.challenge, 'authentication', null);
  return options;
}

export interface VerifiedRegistrationResult {
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string[];
}

export async function verifyRegistration(
  rp: RelyingParty,
  expectedChallenge: string,
  response: unknown,
): Promise<VerifiedRegistrationResult> {
  const opts: VerifyRegistrationResponseOpts = {
    response: response as VerifyRegistrationResponseOpts['response'],
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: false,
  };
  const verification = await verifyRegistrationResponse(opts);
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration could not be verified');
  }
  const info = verification.registrationInfo;
  const cred = info.credential;
  return {
    credentialId: cred.id,
    publicKey: cred.publicKey,
    counter: cred.counter,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    transports: cred.transports ?? [],
  };
}

export interface VerifiedAuthenticationResult {
  newCounter: number;
}

export async function verifyAuthentication(
  rp: RelyingParty,
  expectedChallenge: string,
  response: unknown,
  credential: WebauthnCredentialRow,
): Promise<VerifiedAuthenticationResult> {
  const opts: VerifyAuthenticationResponseOpts = {
    response: response as VerifyAuthenticationResponseOpts['response'],
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: false,
    credential: {
      id: credential.id,
      publicKey: credential.public_key,
      counter: credential.counter,
      transports: (credential.transports
        ? (JSON.parse(credential.transports) as string[])
        : undefined) as VerifyAuthenticationResponseOpts['credential']['transports'],
    },
  };
  const verification = await verifyAuthenticationResponse(opts);
  if (!verification.verified) {
    throw new Error('Authentication could not be verified');
  }
  return { newCounter: verification.authenticationInfo.newCounter };
}

export { base64urlEncode, base64urlDecode };
