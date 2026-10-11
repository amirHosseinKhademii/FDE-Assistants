/**
 * Server side of "Ask about this address". The only file in bostad-app that
 * imports @bostad/ai, and it is reached only from api.ask.tsx. Clients never
 * import it: the card talks to /api/ask over HTTP.
 *
 * Enabled only in the dev server, or when BOSTAD_ASK=1 is set. So the deployed
 * site does not change until that is decided.
 */
import { askAddress, type AddressAnswer } from '@bostad/ai';
import { loadRepoEnv } from './load-env';

export function askEnabled(): boolean {
  return import.meta.env.DEV || process.env.BOSTAD_ASK === '1';
}

export async function askFor(address: string, question: string): Promise<{ answer: AddressAnswer | null; errors: string[] }> {
  loadRepoEnv();
  const result = await askAddress(address, question, { surface: 'bostad-web' });
  return { answer: result.answer, errors: result.errors };
}
