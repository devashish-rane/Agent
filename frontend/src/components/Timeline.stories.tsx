import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Timeline } from './Timeline';

const meta: Meta<typeof Timeline> = {
  title: 'Timeline/Adaptive',
  component: Timeline,
};

export default meta;

type Story = StoryObj<typeof Timeline>;

export const Default: Story = {
  render: () => <Timeline />,
};
