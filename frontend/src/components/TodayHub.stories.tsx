import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TodayHub } from './TodayHub';

const meta: Meta<typeof TodayHub> = {
  title: 'Today Hub/Daily Plan',
  component: TodayHub,
};

export default meta;

type Story = StoryObj<typeof TodayHub>;

export const Default: Story = {
  render: () => <TodayHub />,
};
