import React, { createContext, useContext, useMemo } from 'react';
import type { CVMeshConfig } from '@cvmesh/fetcher';

export interface CVMeshContextValue {
  config?: CVMeshConfig;
}

const CVMeshContext = createContext<CVMeshContextValue | null>(null);

export interface CVMeshProviderProps {
  /**
   * Global configuration for all useFetchResume instances within this subtree.
   */
  config?: CVMeshConfig;
  children: React.ReactNode;
}

/**
 * Optional provider to define global CVMesh configuration (e.g. baseUrl, default timeout)
 * across your application.
 *
 * @example
 * ```tsx
 * <CVMeshProvider config={{ baseUrl: 'https://cvmesh.net' }}>
 *   <App />
 * </CVMeshProvider>
 * ```
 */
export function CVMeshProvider({ config, children }: CVMeshProviderProps): React.ReactElement {
  const value = useMemo(() => ({ config }), [config]);
  return <CVMeshContext.Provider value={value}>{children}</CVMeshContext.Provider>;
}

/**
 * Access the nearest CVMesh configuration context.
 */
export function useCVMeshConfig(): CVMeshConfig | undefined {
  const context = useContext(CVMeshContext);
  return context?.config;
}
