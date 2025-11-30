import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CommandPalette } from './CommandPalette';

const meta: Meta<typeof CommandPalette> = {
  title: 'Command Palette/Interactive',
  component: CommandPalette,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof CommandPalette>;

export const Default: Story = {
  render: () => <CommandPalette />,
};
