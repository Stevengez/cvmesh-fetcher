export { CVMeshProvider, useCVMeshConfig } from './provider';
export type { CVMeshProviderProps, CVMeshContextValue } from './provider';

export { useFetchResume } from './use-fetch-resume';
export type { UseFetchResumeOptions, UseFetchResumeReturn } from './use-fetch-resume';

// Re-export core types and errors from @cvmesh/fetcher for consumer convenience
export {
  CVMeshClient,
  requestResume,
  CVMeshError,
  PopupBlockedError,
  UserCancelledError,
  TimeoutError,
  TokenRedemptionError,
  DEFAULT_BASE_URL,
} from '@cvmesh/fetcher';

export type {
  CVMeshConfig,
  ResumeRequestOptions,
  FetchResumeResult,
  ResumeResponse,
  JsonResume,
  ResumeBasics,
  ResumeLocation,
  ResumeProfile,
  ResumeWork,
  ResumeVolunteer,
  ResumeEducation,
  ResumeAward,
  ResumeCertificate,
  ResumePublication,
  ResumeSkill,
  ResumeLanguage,
  ResumeInterest,
  ResumeReference,
  ResumeProject,
} from '@cvmesh/fetcher';
