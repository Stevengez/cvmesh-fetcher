import type { JsonResume } from './schema';

export interface CVMeshConfig {
  /**
   * Base URL of the CVMesh application.
   * @default 'https://cvmesh.net'
   */
  baseUrl?: string;

  /**
   * Browser window features string passed to `window.open`.
   * @default 'width=520,height=720,scrollbars=yes'
   */
  popupFeatures?: string;

  /**
   * Request timeout in milliseconds while waiting for popup interaction.
   * @default 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Explicit caller origin override.
   * Defaults to `window.location.origin` in browser environments.
   */
  origin?: string;
}

export interface ResumeRequestOptions {
  /**
   * Specific sections to request (e.g. ['basics', 'work', 'skills']).
   * The candidate can still review and grant/deny individual sections.
   */
  sections?: string[];

  /**
   * Desired response format.
   * @default 'json'
   */
  format?: 'json' | 'xml';

  /**
   * Optional custom fetch implementation (useful in SSR or custom HTTP wrappers).
   */
  fetch?: typeof globalThis.fetch;
}

export interface FetchResumeResult<T = JsonResume> {
  /**
   * The parsed resume data adhering to JSON Resume format (or string if XML).
   */
  resume: T;

  /**
   * The single-use ephemeral share token that was redeemed.
   */
  token: string;
}

export type ResumeResponse<T = JsonResume> = FetchResumeResult<T>;

export interface CVMeshShareMessagePayload {
  type: 'CVMESH_RESUME_SHARE';
  token: string;
  nonce: string;
  expiresIn: number;
}

export interface CVMeshCancelMessagePayload {
  type: 'CVMESH_RESUME_SHARE_CANCELLED';
  nonce: string;
}

export type CVMeshMessagePayload = CVMeshShareMessagePayload | CVMeshCancelMessagePayload;
