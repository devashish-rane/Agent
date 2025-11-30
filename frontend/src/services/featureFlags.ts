import { cachedFetch } from './apiClient';

export type FeatureFlags = Record<string, boolean>;

const defaultFlags: FeatureFlags = {
  experimentalNudges: false,
  showAgentPreview: true,
  timelineHeatmap: true,
};

const fromEnv = () => {
  const envFlags: FeatureFlags = {};
  const raw = import.meta.env.VITE_FEATURE_FLAGS;
  if (raw) {
    raw.split(',').forEach((flag) => {
      const [key, value] = flag.split(':');
      envFlags[key] = value === 'true';
    });
  }
  return envFlags;
};

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
  try {
    const endpoint = import.meta.env.VITE_CONFIG_ENDPOINT ?? '/api/flags';
    const ssmNamespace = import.meta.env.VITE_SSM_NAMESPACE ?? 'frontier/flags';
    const url = `${endpoint}?namespace=${encodeURIComponent(ssmNamespace)}`;
    const remote = await cachedFetch<FeatureFlags>(url, { cacheKey: 'featureFlags', ttlMs: 1000 * 60 * 5 });
    return { ...defaultFlags, ...fromEnv(), ...remote };
  } catch (error) {
    console.warn('Falling back to local feature flags after failure', error);
    return { ...defaultFlags, ...fromEnv() };
  }
};
