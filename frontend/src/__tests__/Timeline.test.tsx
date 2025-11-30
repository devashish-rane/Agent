import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Timeline } from '../components/Timeline';
import { FeatureFlagProvider } from '../contexts/FeatureFlagContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../designSystem/theme';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    <ThemeProvider>
      <AccessibilityProvider>
        <FeatureFlagProvider>{children}</FeatureFlagProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

describe('Timeline keyboard navigation', () => {
  it('moves focus with arrow keys', async () => {
    render(<Timeline />, { wrapper });
    const rows = await screen.findAllByRole('listitem');
    rows[0].focus();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows[1]);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(rows[0]);
  });
});
