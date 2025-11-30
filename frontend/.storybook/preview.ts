import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles.css';
import { ThemeProvider } from '../src/designSystem/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';
import { FeatureFlagProvider } from '../src/contexts/FeatureFlagContext';

const queryClient = new QueryClient();

const preview: Preview = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AccessibilityProvider>
            <FeatureFlagProvider>
              <Story />
            </FeatureFlagProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
