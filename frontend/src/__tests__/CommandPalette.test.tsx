import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CommandPalette } from '../components/CommandPalette';
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

describe('CommandPalette accessibility', () => {
  it('submits via keyboard shortcut', async () => {
    render(<CommandPalette />, { wrapper });
    const input = screen.getByLabelText(/command input/i);
    input.focus();
    fireEvent.change(input, { target: { value: 'Write tests' } });
    fireEvent.keyDown(window, { key: 'Enter', altKey: true });
    await waitFor(() => expect(screen.getByText(/Command captured/i)).toBeInTheDocument());
  });

  it('shows agent previews when typing', async () => {
    render(<CommandPalette />, { wrapper });
    const input = screen.getByLabelText(/command input/i);
    fireEvent.change(input, { target: { value: 'Plan day' } });
    await waitFor(() => expect(screen.getByRole('list', { name: /Agent previews/i })).toBeInTheDocument());
  });
});
