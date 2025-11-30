import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFeatureFlags, FeatureFlags } from '../services/featureFlags';

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  isLoading: boolean;
  refresh: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

export const FeatureFlagProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const query = useQuery({
    queryKey: ['featureFlags'],
    queryFn: fetchFeatureFlags,
    staleTime: 1000 * 60 * 5,
  });

  const value: FeatureFlagContextValue = {
    flags: query.data ?? {},
    isLoading: query.isFetching,
    refresh: () => query.refetch(),
  };

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
};

export const useFeatureFlags = (): FeatureFlagContextValue => {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  return ctx;
};
