/**
 * get_profile_section: one section of the address profile, with its status.
 *
 * The profile is fetched once per address per question. Every section comes
 * from the same fetch, so asking for five sections costs one profile call, not
 * five. The cache is an in-memory map, and it lives only as long as the object
 * returned by createProfileCache(). Create one per question, so a cached profile
 * never outlives the question that needed it.
 *
 * A section that is not "ok" is returned as it is, with its status and reason.
 * It is never replaced with a guess or a neighbouring value. The model is told
 * the section failed, and the answer schema forces that into not_in_data.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import { getProfile, type Profile } from '@bostad/property';
import { SECTION_NAMES, type SectionName } from '../schema/address-answer';

export const GET_PROFILE_SECTION = 'get_profile_section';

export type ProfileLoader = (address: string) => Promise<Profile>;

function cacheKey(address: string): string {
  return address.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Wrap a loader so each address is fetched at most once. A failed fetch is
 * forgotten, so a retry in the same question can try again.
 */
export function createProfileCache(load: ProfileLoader = getProfile): ProfileLoader {
  const cache = new Map<string, Promise<Profile>>();
  return (address: string) => {
    const key = cacheKey(address);
    const hit = cache.get(key);
    if (hit) return hit;
    const fetched = load(address);
    cache.set(key, fetched);
    fetched.catch(() => cache.delete(key));
    return fetched;
  };
}

export interface GetProfileSectionArgs {
  address: string;
  section: SectionName;
}

export interface GetProfileSectionResult {
  section: SectionName;
  status: 'ok' | 'error' | 'unavailable';
  source: string;
  data: unknown;
  /** Why a section is not "ok". Null when it is. */
  reason: string | null;
}

export function getProfileSectionTool(
  loadProfile: ProfileLoader = createProfileCache(),
): Tool<GetProfileSectionArgs, GetProfileSectionResult> {
  return {
    // Calls public APIs, so it is fixture-backed in evals like any external tool.
    hasUpstream: true,

    schema: {
      type: 'function',
      name: GET_PROFILE_SECTION,
      description:
        'Get one section of the address profile. Returns the section status ' +
        '("ok", "error" or "unavailable"), the source it came from, its data, and ' +
        'the reason when it is not ok. Use the section that holds the answer. ' +
        'Do not answer from memory or from another address.',
      parameters: z.strictObject({
        address: z
          .string()
          .describe('The address the profile is for, as the user gave it.'),
        section: z
          .enum(SECTION_NAMES)
          .describe(
            'Which section to read: location, landslide, transit, noise, district, ' +
              'income, places, area, price (Göteborg-wide), safety, brf, energy.',
          ),
      }),
    },

    async execute({ address, section }) {
      const profile = await loadProfile(address);
      const s = profile[section];
      return {
        section,
        status: s.status,
        source: s.source,
        data: s.data ?? null,
        reason: s.reason ?? null,
      };
    },
  };
}
