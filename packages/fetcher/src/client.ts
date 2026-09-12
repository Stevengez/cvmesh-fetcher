import {
  DEFAULT_BASE_URL,
  DEFAULT_POPUP_FEATURES,
  DEFAULT_TIMEOUT_MS,
  POPUP_POLL_INTERVAL_MS,
  MESSAGE_TYPE_SHARE,
  MESSAGE_TYPE_CANCELLED,
} from './constants';
import {
  CVMeshError,
  PopupBlockedError,
  UserCancelledError,
  TimeoutError,
  TokenRedemptionError,
} from './errors';
import type {
  CVMeshConfig,
  ResumeRequestOptions,
  FetchResumeResult,
  CVMeshMessagePayload,
} from './types';
import type { JsonResume } from './schema';

function generateNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class CVMeshClient {
  private config: Required<CVMeshConfig>;
  private activeCleanups: Set<() => void> = new Set();

  constructor(config: CVMeshConfig = {}) {
    const rawBaseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.config = {
      baseUrl: rawBaseUrl.replace(/\/+$/, ''),
      popupFeatures: config.popupFeatures || DEFAULT_POPUP_FEATURES,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      origin: config.origin || (typeof window !== 'undefined' ? window.location.origin : ''),
    };
  }

  /**
   * Updates configuration dynamically.
   */
  public setConfig(config: Partial<CVMeshConfig>): void {
    if (config.baseUrl) {
      this.config.baseUrl = config.baseUrl.replace(/\/+$/, '');
    }
    if (config.popupFeatures) {
      this.config.popupFeatures = config.popupFeatures;
    }
    if (config.timeout !== undefined) {
      this.config.timeout = config.timeout;
    }
    if (config.origin !== undefined) {
      this.config.origin = config.origin;
    }
  }

  /**
   * Retrieves current active configuration.
   */
  public getConfig(): Readonly<Required<CVMeshConfig>> {
    return { ...this.config };
  }

  /**
   * Opens the CVMesh consent & resume picker popup, awaits candidate approval,
   * redeems the single-use token with the CVMesh API, and returns the JSON Resume.
   */
  public async requestResume<T = JsonResume>(
    options: ResumeRequestOptions = {}
  ): Promise<FetchResumeResult<T>> {
    if (typeof window === 'undefined') {
      throw new CVMeshError('requestResume can only be executed in a browser environment with window support.');
    }

    const nonce = generateNonce();
    const origin = this.config.origin || window.location.origin;

    const queryParams = new URLSearchParams({
      origin,
      nonce,
    });

    if (options.sections && options.sections.length > 0) {
      queryParams.set('sections', options.sections.join(','));
    }

    const popupUrl = `${this.config.baseUrl}/share/pick?${queryParams.toString()}`;
    const popup = window.open(popupUrl, 'cvmesh-share', this.config.popupFeatures);

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      throw new PopupBlockedError();
    }

    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(this.config.baseUrl).origin;
    } catch {
      expectedOrigin = this.config.baseUrl;
    }

    return new Promise<FetchResumeResult<T>>((resolve, reject) => {
      let isSettled = false;
      let pollInterval: ReturnType<typeof setInterval> | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        window.removeEventListener('message', messageListener);
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        this.activeCleanups.delete(cleanup);
      };

      this.activeCleanups.add(cleanup);

      const settle = (callback: () => void) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        callback();
      };

      const messageListener = async (event: MessageEvent) => {
        // Enforce origin checking: must match configured CVMesh host
        let isOriginMatch = false;
        try {
          const eventOrigin = new URL(event.origin).origin.toLowerCase();
          const targetOrigin = new URL(this.config.baseUrl).origin.toLowerCase();
          const currentOrigin = window.location.origin.toLowerCase();
          isOriginMatch =
            eventOrigin === targetOrigin ||
            eventOrigin === currentOrigin ||
            (targetOrigin.includes('localhost') && eventOrigin.includes('127.0.0.1')) ||
            (targetOrigin.includes('127.0.0.1') && eventOrigin.includes('localhost'));
        } catch {
          isOriginMatch = event.origin === expectedOrigin || event.origin === window.location.origin;
        }

        if (!isOriginMatch) {
          return;
        }

        const data = event.data as CVMeshMessagePayload | undefined;
        if (!data || typeof data !== 'object') return;

        if (data.nonce !== nonce) return;

        if (data.type === MESSAGE_TYPE_CANCELLED) {
          settle(() => reject(new UserCancelledError()));
          return;
        }

        if (data.type === MESSAGE_TYPE_SHARE) {
          const shareToken = data.token;
          settle(async () => {
            try {
              const result = await this.redeemToken<T>(shareToken, options);
              resolve({
                resume: result,
                token: shareToken,
              });
            } catch (err) {
              reject(err);
            }
          });
        }
      };

      window.addEventListener('message', messageListener);

      // Poll to detect if candidate manually closed the popup without action
      pollInterval = setInterval(() => {
        try {
          if (popup.closed) {
            // Short delay to avoid race condition if postMessage just arrived
            setTimeout(() => {
              settle(() => {
                reject(new UserCancelledError('Sign-in or resume picker popup was closed.'));
              });
            }, 300);
          }
        } catch {
          // Cross-origin read security error may occur if redirected away
        }
      }, POPUP_POLL_INTERVAL_MS);

      // Timeout safety check
      if (this.config.timeout > 0) {
        timeoutTimer = setTimeout(() => {
          settle(() => {
            try {
              if (!popup.closed) {
                popup.close();
              }
            } catch {
              // Ignore
            }
            reject(new TimeoutError(`Resume request exceeded timeout of ${this.config.timeout}ms.`));
          });
        }, this.config.timeout);
      }
    });
  }

  /**
   * Redeems an ephemeral single-use token via the CVMesh redemption API.
   * Can also be called directly if a token was obtained through another flow.
   */
  public async redeemToken<T = JsonResume>(
    token: string,
    options: ResumeRequestOptions = {}
  ): Promise<T> {
    const fetchImpl = options.fetch || (typeof fetch !== 'undefined' ? fetch : globalThis.fetch);
    if (!fetchImpl) {
      throw new CVMeshError('Global fetch is not available. Please provide a fetch implementation in options.');
    }

    const format = options.format || 'json';
    const params = new URLSearchParams({ token });
    if (format === 'xml') {
      params.set('format', 'xml');
    }

    const requestUrl = `${this.config.baseUrl}/api/share/resume?${params.toString()}`;
    const headers: Record<string, string> = {
      Accept: format === 'xml' ? 'application/xml, text/xml' : 'application/json',
    };

    const response = await fetchImpl(requestUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorMessage = response.statusText || 'Unknown error';
      let details: unknown;
      try {
        const body = await response.json();
        if (body?.error) {
          errorMessage = body.error;
        }
        details = body;
      } catch {
        // Non-JSON error body
      }
      throw new TokenRedemptionError(response.status, errorMessage, details);
    }

    if (format === 'xml') {
      const text = await response.text();
      return text as unknown as T;
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Cancels and cleans up all currently active listeners and timers.
   */
  public destroy(): void {
    for (const cleanup of this.activeCleanups) {
      cleanup();
    }
    this.activeCleanups.clear();
  }
}
