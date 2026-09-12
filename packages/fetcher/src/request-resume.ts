import { CVMeshClient } from './client';
import type { CVMeshConfig, ResumeRequestOptions, FetchResumeResult } from './types';
import type { JsonResume } from './schema';

/**
 * Convenience function to initiate a resume request using a temporary CVMeshClient.
 * Automatically initializes the client, triggers the popup, redeems the token, and destroys listeners.
 *
 * @example
 * ```ts
 * import { requestResume } from '@cvmesh/fetcher';
 *
 * const { resume } = await requestResume();
 * console.log('Candidate name:', resume.basics.name);
 * ```
 */
export async function requestResume<T = JsonResume>(
  config?: CVMeshConfig,
  options?: ResumeRequestOptions
): Promise<FetchResumeResult<T>> {
  const client = new CVMeshClient(config);
  try {
    return await client.requestResume<T>(options);
  } finally {
    client.destroy();
  }
}
