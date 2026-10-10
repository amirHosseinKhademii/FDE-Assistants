import { getProfile } from '@bostad/property';
import { loadRepoEnv } from './load-env';

export async function profileFor(address: string) {
  loadRepoEnv();
  return getProfile(address);
}
