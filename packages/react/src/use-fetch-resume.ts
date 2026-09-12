import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  CVMeshClient,
  UserCancelledError,
  type CVMeshConfig,
  type ResumeRequestOptions,
  type FetchResumeResult,
  type JsonResume,
} from '@cvmesh/fetcher';
import { useCVMeshConfig } from './provider';

export interface UseFetchResumeOptions {
  /**
   * Override CVMesh client configuration for this specific hook instance.
   */
  config?: CVMeshConfig;

  /**
   * Default sections to request from the candidate's resume.
   * e.g. ['basics', 'work', 'education', 'skills']
   */
  sections?: string[];

  /**
   * Desired response format.
   * @default 'json'
   */
  format?: 'json' | 'xml';

  /**
   * Callback invoked upon successful resume retrieval and token redemption.
   */
  onSuccess?: (result: FetchResumeResult) => void;

  /**
   * Callback invoked if the request fails (e.g. popup blocked, timeout, network error).
   * Note: This does NOT trigger on user cancellation if onCancel is provided,
   * unless onCancel is omitted.
   */
  onError?: (error: Error) => void;

  /**
   * Callback invoked specifically when the candidate cancels or closes the popup.
   */
  onCancel?: () => void;
}

export interface UseFetchResumeReturn {
  /**
   * Triggers the popup flow to request the candidate's resume.
   * Resolves with the resume result, or null if cancelled.
   */
  fetchResume: (overrideOptions?: ResumeRequestOptions) => Promise<FetchResumeResult | null>;

  /**
   * Helper props to spread directly onto any standard HTML button or UI library button:
   * `<button {...getButtonProps()}>Fetch Resume</button>`
   */
  getButtonProps: (
    userProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  ) => React.ButtonHTMLAttributes<HTMLButtonElement>;

  /**
   * The retrieved JSON Resume, or null if not yet fetched.
   */
  resume: JsonResume | null;

  /**
   * The redeemed single-use share token, or null.
   */
  token: string | null;

  /**
   * True while the consent popup is open or the token is being redeemed.
   */
  loading: boolean;

  /**
   * The error object if the last request failed.
   */
  error: Error | null;

  /**
   * Resets the hook state back to initial (clears resume, token, error, loading).
   */
  reset: () => void;
}

/**
 * React hook for integrating CVMesh resume fetching into any button or workflow.
 *
 * @example
 * ```tsx
 * const { fetchResume, loading, resume } = useFetchResume({
 *   onSuccess: ({ resume }) => {
 *     console.log('Got resume for:', resume.basics.name);
 *   },
 * });
 *
 * return (
 *   <button onClick={() => fetchResume()} disabled={loading}>
 *     {loading ? 'Connecting...' : 'Autofill with CVMesh'}
 *   </button>
 * );
 * ```
 */
export function useFetchResume(options: UseFetchResumeOptions = {}): UseFetchResumeReturn {
  const providerConfig = useCVMeshConfig();

  const mergedConfig = useMemo<CVMeshConfig>(() => {
    return {
      ...providerConfig,
      ...options.config,
    };
  }, [providerConfig, options.config]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Store active client in ref. Initialize once so re-renders don't destroy active listeners.
  const clientRef = useRef<CVMeshClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new CVMeshClient(mergedConfig);
  }

  // Update client configuration if values change without destroying the client
  const prevConfigRef = useRef(mergedConfig);
  useEffect(() => {
    if (
      prevConfigRef.current.baseUrl !== mergedConfig.baseUrl ||
      prevConfigRef.current.timeout !== mergedConfig.timeout ||
      prevConfigRef.current.origin !== mergedConfig.origin ||
      prevConfigRef.current.popupFeatures !== mergedConfig.popupFeatures
    ) {
      prevConfigRef.current = mergedConfig;
      clientRef.current?.setConfig(mergedConfig);
    }
  }, [
    mergedConfig.baseUrl,
    mergedConfig.timeout,
    mergedConfig.origin,
    mergedConfig.popupFeatures,
  ]);

  // Keep latest callbacks in refs to avoid stale closures
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  });

  // Only destroy client when component unmounts
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResume(null);
    setToken(null);
  }, []);

  const fetchResume = useCallback(
    async (overrideOptions?: ResumeRequestOptions): Promise<FetchResumeResult | null> => {
      if (!clientRef.current) {
        clientRef.current = new CVMeshClient(mergedConfig);
      }

      setLoading(true);
      setError(null);

      const requestOptions: ResumeRequestOptions = {
        sections: overrideOptions?.sections ?? options.sections,
        format: overrideOptions?.format ?? options.format ?? 'json',
        fetch: overrideOptions?.fetch,
      };

      try {
        const result = await clientRef.current.requestResume(requestOptions);
        setResume(result.resume);
        setToken(result.token);
        setLoading(false);

        callbacksRef.current.onSuccess?.(result);
        return result;
      } catch (err: any) {
        setLoading(false);
        const errObj = err instanceof Error ? err : new Error(String(err));
        setError(errObj);

        if (errObj instanceof UserCancelledError) {
          if (callbacksRef.current.onCancel) {
            callbacksRef.current.onCancel();
            return null;
          }
        }

        callbacksRef.current.onError?.(errObj);
        return null;
      }
    },
    [mergedConfig, options.sections, options.format]
  );

  const getButtonProps = useCallback(
    (userProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {}): React.ButtonHTMLAttributes<HTMLButtonElement> => {
      const { onClick: userOnClick, disabled: userDisabled, ...rest } = userProps;

      return {
        ...rest,
        type: userProps.type || 'button',
        disabled: userDisabled !== undefined ? userDisabled : loading,
        'aria-busy': loading,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          userOnClick?.(event);
          if (!event.defaultPrevented) {
            fetchResume();
          }
        },
      };
    },
    [loading, fetchResume]
  );

  return {
    fetchResume,
    getButtonProps,
    resume,
    token,
    loading,
    error,
    reset,
  };
}
