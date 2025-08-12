/**
 * Assignment Card Storybook Stories
 * Story 2.1: Assignment Card Component System
 */

import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import AssignmentCard from '../../components/Assignment/AssignmentCard';
import { 
  CurrentAssignmentCard,
  UpcomingAssignmentCard,
  CompletedAssignmentCard,
  CancelledAssignmentCard,
  AdaptiveAssignmentCard
} from '../../components/Assignment/AssignmentCardVariants';
import { Assignment } from '../../types/assignments';

const meta: Meta<typeof AssignmentCard> = {
  title: 'Assignment/AssignmentCard',
  component: AssignmentCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, backgroundColor: '#f5f5f5' }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseAssignment: Assignment = {
  id: 'story-assignment-1',
  matchId: 'match-123',
  courtNumber: '3',
  homeTeam: 'Team Alpha',
  awayTeam: 'Team Beta',
  matchTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
  refereePosition: '1st',
  status: 'upcoming',
  tournamentName: 'Beach Championship',
  notes: 'Weather conditions: sunny, light wind'
};

export const Default: Story = {
  args: {
    assignment: baseAssignment,
  },
};

export const CurrentAssignment: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      status: 'current',
      matchTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    },
    variant: 'current',
    showCountdown: true,
    isInteractive: true,
  },
};

export const UpcomingAssignment: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      status: 'upcoming',
      matchTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
    variant: 'upcoming',
    isInteractive: true,
  },
};

export const CompletedAssignment: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      status: 'completed',
      matchTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      matchResult: 'Team Alpha won 2-1 (21-19, 18-21, 15-13)'
    },
    variant: 'completed',
    isInteractive: false,
  },
};

export const CancelledAssignment: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      status: 'cancelled',
      notes: 'Match cancelled due to weather conditions'
    },
    variant: 'cancelled',
    isInteractive: false,
  },
};

export const InteractiveCard: Story = {
  args: {
    assignment: baseAssignment,
    isInteractive: true,
    onPress: (assignment) => {
      console.log('Assignment pressed:', assignment.id);
    },
  },
};

export const WithCountdown: Story = {
  args: {
    assignment: {
      ...baseAssignment,
      matchTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    },
    showCountdown: true,
  },
};

// Variant Components Stories
export const CurrentVariantCard: Story = {
  render: () => (
    <CurrentAssignmentCard
      assignment={{
        ...baseAssignment,
        status: 'current',
        matchTime: new Date(Date.now() + 10 * 60 * 1000),
      }}
    />
  ),
};

export const UpcomingVariantCard: Story = {
  render: () => (
    <UpcomingAssignmentCard
      assignment={{
        ...baseAssignment,
        status: 'upcoming',
        matchTime: new Date(Date.now() + 25 * 60 * 1000), // Starting soon
      }}
    />
  ),
};

export const CompletedVariantCard: Story = {
  render: () => (
    <CompletedAssignmentCard
      assignment={{
        ...baseAssignment,
        status: 'completed',
        matchTime: new Date(Date.now() - 30 * 60 * 1000),
        matchResult: 'Team Beta won 2-0 (21-18, 21-15)'
      }}
    />
  ),
};

export const CancelledVariantCard: Story = {
  render: () => (
    <CancelledAssignmentCard
      assignment={{
        ...baseAssignment,
        status: 'cancelled',
        notes: 'Court maintenance required'
      }}
    />
  ),
};

export const AdaptiveVariantCard: Story = {
  render: () => (
    <AdaptiveAssignmentCard
      assignment={{
        ...baseAssignment,
        status: 'current',
        matchTime: new Date(Date.now() + 2 * 60 * 1000),
      }}
    />
  ),
};

// Touch Target Compliance Examples
export const TouchTargetCompliance: Story = {
  render: () => (
    <View>
      <AssignmentCard
        assignment={baseAssignment}
        isInteractive={true}
        onPress={() => console.log('Touch target compliant - 44px minimum')}
      />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates 44px minimum touch target compliance for outdoor conditions.',
      },
    },
  },
};

// Different Referee Positions
export const RefereePositions: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      {(['1st', '2nd', 'Line', 'Reserve'] as const).map(position => (
        <AssignmentCard
          key={position}
          assignment={{
            ...baseAssignment,
            id: `${position}-ref`,
            refereePosition: position,
          }}
        />
      ))}
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows assignment cards for different referee positions.',
      },
    },
  },
};