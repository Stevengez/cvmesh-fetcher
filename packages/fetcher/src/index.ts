export { CVMeshClient } from './client';
export { requestResume } from './request-resume';
export {
  CVMeshError,
  PopupBlockedError,
  UserCancelledError,
  TimeoutError,
  TokenRedemptionError,
} from './errors';
export {
  DEFAULT_BASE_URL,
  DEFAULT_POPUP_FEATURES,
  DEFAULT_TIMEOUT_MS,
  MESSAGE_TYPE_SHARE,
  MESSAGE_TYPE_CANCELLED,
} from './constants';

export type {
  CVMeshConfig,
  ResumeRequestOptions,
  FetchResumeResult,
  ResumeResponse,
  CVMeshShareMessagePayload,
  CVMeshCancelMessagePayload,
  CVMeshMessagePayload,
} from './types';

export type {
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
} from './schema';
