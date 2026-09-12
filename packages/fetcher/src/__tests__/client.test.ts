import { describe, it, expect, vi, afterEach } from 'vitest';
import { CVMeshClient } from '../client';
import { requestResume } from '../request-resume';
import {
  PopupBlockedError,
  UserCancelledError,
  TimeoutError,
  TokenRedemptionError,
} from '../errors';
import { DEFAULT_BASE_URL } from '../constants';
import type { JsonResume } from '../schema';

const mockResume: JsonResume = {
  $schema: 'https://jsonresume.org/schema',
  basics: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    label: 'Software Engineer',
  },
  skills: [
    { name: 'TypeScript', level: 'Expert' },
  ],
};

describe('CVMeshClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default config and strips trailing slash from baseUrl', () => {
    const client = new CVMeshClient();
    const config = client.getConfig();
    expect(config.baseUrl).toBe(DEFAULT_BASE_URL);

    const customClient = new CVMeshClient({ baseUrl: 'https://custom.cvmesh.net/' });
    expect(customClient.getConfig().baseUrl).toBe('https://custom.cvmesh.net');
  });

  it('updates configuration via setConfig', () => {
    const client = new CVMeshClient();
    client.setConfig({ baseUrl: 'https://staging.cvmesh.net/', timeout: 10000 });
    const config = client.getConfig();
    expect(config.baseUrl).toBe('https://staging.cvmesh.net');
    expect(config.timeout).toBe(10000);
  });

  it('throws PopupBlockedError if window.open returns null', async () => {
    const mockOpen = vi.fn().mockReturnValue(null);
    vi.stubGlobal('window', {
      open: mockOpen,
      location: { origin: 'https://example.com' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const client = new CVMeshClient();
    await expect(client.requestResume()).rejects.toThrow(PopupBlockedError);
  });

  it('successfully handles postMessage and redeems token', async () => {
    let capturedListener: ((event: MessageEvent) => void) | null = null;
    let openedUrl = '';

    const mockPopup = {
      closed: false,
      close: vi.fn(),
    };

    const mockAddEventListener = vi.fn((event: string, cb: (e: MessageEvent) => void) => {
      if (event === 'message') {
        capturedListener = cb;
      }
    });

    vi.stubGlobal('window', {
      open: vi.fn((url: string) => {
        openedUrl = url;
        return mockPopup;
      }),
      location: { origin: 'https://example.com' },
      addEventListener: mockAddEventListener,
      removeEventListener: vi.fn(),
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResume),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new CVMeshClient();
    const requestPromise = client.requestResume({ sections: ['basics', 'skills'] });

    expect(openedUrl).toContain('origin=https%3A%2F%2Fexample.com');
    expect(openedUrl).toContain('sections=basics%2Cskills');

    // Extract nonce from URL
    const urlObj = new URL(openedUrl);
    const nonce = urlObj.searchParams.get('nonce')!;
    expect(nonce).toBeTruthy();

    expect(capturedListener).toBeDefined();

    // Trigger postMessage
    await capturedListener!({
      origin: 'https://cvmesh.net',
      data: {
        type: 'CVMESH_RESUME_SHARE',
        token: 'cvs_test_token_123',
        nonce,
        expiresIn: 180,
      },
    } as MessageEvent);

    const result = await requestPromise;
    expect(result.token).toBe('cvs_test_token_123');
    expect(result.resume).toEqual(mockResume);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/share/resume?token=cvs_test_token_123'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('rejects with UserCancelledError when candidate cancels in popup', async () => {
    let capturedListener: ((event: MessageEvent) => void) | null = null;
    let openedUrl = '';

    vi.stubGlobal('window', {
      open: vi.fn((url: string) => {
        openedUrl = url;
        return { closed: false, close: vi.fn() };
      }),
      location: { origin: 'https://example.com' },
      addEventListener: vi.fn((event: string, cb: (e: MessageEvent) => void) => {
        if (event === 'message') capturedListener = cb;
      }),
      removeEventListener: vi.fn(),
    });

    const client = new CVMeshClient();
    const requestPromise = client.requestResume();

    const urlObj = new URL(openedUrl);
    const nonce = urlObj.searchParams.get('nonce')!;

    await capturedListener!({
      origin: 'https://cvmesh.net',
      data: {
        type: 'CVMESH_RESUME_SHARE_CANCELLED',
        nonce,
      },
    } as MessageEvent);

    await expect(requestPromise).rejects.toThrow(UserCancelledError);
  });

  it('rejects with TimeoutError when request times out', async () => {
    vi.useFakeTimers();

    const mockClose = vi.fn();
    vi.stubGlobal('window', {
      open: vi.fn().mockReturnValue({ closed: false, close: mockClose }),
      location: { origin: 'https://example.com' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const client = new CVMeshClient({ timeout: 5000 });
    const requestPromise = client.requestResume();

    // Advance time past timeout
    vi.advanceTimersByTime(5001);

    await expect(requestPromise).rejects.toThrow(TimeoutError);
    expect(mockClose).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('rejects with TokenRedemptionError when API returns non-200', async () => {
    let capturedListener: ((event: MessageEvent) => void) | null = null;
    let openedUrl = '';

    vi.stubGlobal('window', {
      open: vi.fn((url: string) => {
        openedUrl = url;
        return { closed: false, close: vi.fn() };
      }),
      location: { origin: 'https://example.com' },
      addEventListener: vi.fn((event: string, cb: (e: MessageEvent) => void) => {
        if (event === 'message') capturedListener = cb;
      }),
      removeEventListener: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 410,
      statusText: 'Gone',
      json: vi.fn().mockResolvedValue({ error: 'Token has already been redeemed' }),
    }));

    const client = new CVMeshClient();
    const requestPromise = client.requestResume();

    const urlObj = new URL(openedUrl);
    const nonce = urlObj.searchParams.get('nonce')!;

    await capturedListener!({
      origin: 'https://cvmesh.net',
      data: {
        type: 'CVMESH_RESUME_SHARE',
        token: 'cvs_expired_token',
        nonce,
        expiresIn: 180,
      },
    } as MessageEvent);

    await expect(requestPromise).rejects.toThrow(TokenRedemptionError);
  });

  it('supports requestResume convenience helper', async () => {
    let capturedListener: ((event: MessageEvent) => void) | null = null;
    let openedUrl = '';

    vi.stubGlobal('window', {
      open: vi.fn((url: string) => {
        openedUrl = url;
        return { closed: false, close: vi.fn() };
      }),
      location: { origin: 'https://example.com' },
      addEventListener: vi.fn((event: string, cb: (e: MessageEvent) => void) => {
        if (event === 'message') capturedListener = cb;
      }),
      removeEventListener: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResume),
    }));

    const requestPromise = requestResume({ baseUrl: 'https://custom.cvmesh.net' });

    const urlObj = new URL(openedUrl);
    const nonce = urlObj.searchParams.get('nonce')!;

    await capturedListener!({
      origin: 'https://custom.cvmesh.net',
      data: {
        type: 'CVMESH_RESUME_SHARE',
        token: 'cvs_token_helper',
        nonce,
        expiresIn: 180,
      },
    } as MessageEvent);

    const result = await requestPromise;
    expect(result.resume.basics.name).toBe('Jane Doe');
  });
});
