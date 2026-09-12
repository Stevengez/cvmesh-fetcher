import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFetchResume } from '../use-fetch-resume';
import { CVMeshProvider } from '../provider';
import { CVMeshClient, UserCancelledError, type JsonResume } from '@cvmesh/fetcher';

vi.mock('@cvmesh/fetcher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvmesh/fetcher')>();
  const MockClient = vi.fn();
  MockClient.prototype.requestResume = vi.fn();
  MockClient.prototype.destroy = vi.fn();
  MockClient.prototype.setConfig = vi.fn();
  MockClient.prototype.getConfig = vi.fn().mockReturnValue({
    baseUrl: 'https://cvmesh.net',
  });
  return {
    ...actual,
    CVMeshClient: MockClient,
  };
});

const sampleResume: JsonResume = {
  basics: {
    name: 'Alex Johnson',
    email: 'alex@example.com',
  },
};

describe('useFetchResume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default initial state', () => {
    const { result } = renderHook(() => useFetchResume());
    expect(result.current.loading).toBe(false);
    expect(result.current.resume).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles successful resume retrieval', async () => {
    const mockRequest = vi.fn().mockResolvedValue({
      resume: sampleResume,
      token: 'cvs_sample_token',
    });
    vi.mocked(CVMeshClient).prototype.requestResume = mockRequest;

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useFetchResume({ onSuccess }));

    let res: any;
    await act(async () => {
      res = await result.current.fetchResume();
    });

    expect(res).toEqual({ resume: sampleResume, token: 'cvs_sample_token' });
    expect(result.current.loading).toBe(false);
    expect(result.current.resume).toEqual(sampleResume);
    expect(result.current.token).toBe('cvs_sample_token');
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith({ resume: sampleResume, token: 'cvs_sample_token' });
  });

  it('handles user cancellation with onCancel callback', async () => {
    const mockRequest = vi.fn().mockRejectedValue(new UserCancelledError());
    vi.mocked(CVMeshClient).prototype.requestResume = mockRequest;

    const onCancel = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useFetchResume({ onCancel, onError }));

    await act(async () => {
      await result.current.fetchResume();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(UserCancelledError);
    expect(onCancel).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('handles error with onError callback', async () => {
    const testError = new Error('Network error');
    const mockRequest = vi.fn().mockRejectedValue(testError);
    vi.mocked(CVMeshClient).prototype.requestResume = mockRequest;

    const onError = vi.fn();
    const { result } = renderHook(() => useFetchResume({ onError }));

    await act(async () => {
      await result.current.fetchResume();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('generates button props using getButtonProps', () => {
    const { result } = renderHook(() => useFetchResume());
    const props = result.current.getButtonProps({ className: 'custom-btn' });

    expect(props.type).toBe('button');
    expect(props.disabled).toBe(false);
    expect(props['aria-busy']).toBe(false);
    expect(props.className).toBe('custom-btn');
    expect(typeof props.onClick).toBe('function');
  });

  it('resets state when reset() is called', async () => {
    const mockRequest = vi.fn().mockResolvedValue({
      resume: sampleResume,
      token: 'cvs_sample_token',
    });
    vi.mocked(CVMeshClient).prototype.requestResume = mockRequest;

    const { result } = renderHook(() => useFetchResume());

    await act(async () => {
      await result.current.fetchResume();
    });

    expect(result.current.resume).toEqual(sampleResume);

    act(() => {
      result.current.reset();
    });

    expect(result.current.resume).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('inherits baseUrl from CVMeshProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CVMeshProvider config={{ baseUrl: 'https://staging.cvmesh.net' }}>
        {children}
      </CVMeshProvider>
    );

    renderHook(() => useFetchResume(), { wrapper });

    expect(CVMeshClient).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://staging.cvmesh.net' })
    );
  });
});
