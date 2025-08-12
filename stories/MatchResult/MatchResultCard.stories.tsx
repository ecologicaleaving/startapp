/**
 * Match Result Card Storybook Documentation
 * Story 2.2: Match Result Card Optimization
 * 
 * Complete component documentation with examples and usage patterns
 */

import type { Meta, StoryObj } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  MatchResultCard,
  BeachVolleyballResultCard,
  IndoorTournamentResultCard,
  QuickResultEntryCard,
  ScoreEntry,
  SyncStatusIndicator,
  ResultSubmissionWorkflow
} from '../../components/MatchResult';
import { EnhancedMatchResult } from '../../types/MatchResults';
import { designTokens } from '../../theme/tokens';

const meta: Meta<typeof MatchResultCard> = {
  title: 'Match Result Components/MatchResultCard',
  component: MatchResultCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Match Result Card Component System

The Match Result Card components provide a comprehensive system for displaying and managing match results in the tournament referee app. Built with touch-optimization for outdoor conditions and full integration with the Epic 1 design system.

## Key Features

- **Touch-Optimized**: 44px minimum touch targets for outdoor conditions
- **Multi-Variant Support**: Beach volleyball, indoor tournament, and quick entry variants
- **Real-Time Validation**: Score validation with referee-friendly error messages
- **Offline Capability**: Result caching with automatic sync when connection restored
- **Epic 1 Integration**: Full design token and status color integration

## Usage Patterns

### Basic Result Display
Use \`MatchResultCard\` for displaying completed or in-progress match results with read-only access.

### Editable Result Entry
Use variant components (\`BeachVolleyballResultCard\`, \`IndoorTournamentResultCard\`) for active result entry workflows.

### Quick Result Submission
Use \`QuickResultEntryCard\` for time-critical situations requiring immediate result submission.
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['beach', 'indoor', 'quick'],
    },
    isEditable: {
      control: 'boolean',
    },
    showQuickActions: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MatchResultCard>;

// Mock data generators
const createMockMatchResult = (overrides?: Partial<EnhancedMatchResult>): EnhancedMatchResult => ({
  no: 'M001',
  tournamentNo: 'T001',
  matchId: 'M001',
  teamAName: 'Brazil',
  teamBName: 'USA',
  status: 'Running',
  matchPointsA: 1,
  matchPointsB: 0,
  pointsTeamASet1: 21,
  pointsTeamBSet1: 18,
  pointsTeamASet2: 15,
  pointsTeamBSet2: 12,
  pointsTeamASet3: 0,
  pointsTeamBSet3: 0,
  referee1No: 'R001',
  referee1Name: 'John Referee',
  referee1FederationCode: 'USA',
  referee2No: 'R002',
  referee2Name: 'Jane Judge',
  referee2FederationCode: 'CAN',
  durationSet1: '00:25:30',
  durationSet2: '00:28:15',
  durationSet3: '00:00:00',
  localDate: new Date(),
  localTime: '14:30',
  court: '1',
  round: 'Pool A',
  matchType: 'beach',
  resultStatus: 'draft',
  lastModified: new Date(),
  ...overrides,
});

// Story Container
const StoryContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.container}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: designTokens.spacing.large,
    backgroundColor: designTokens.colors.background,
    minWidth: 350,
    maxWidth: 600,
  },
  section: {
    marginBottom: designTokens.spacing.large,
  },
  sectionTitle: {
    ...designTokens.typography.h3,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.medium,
  },
  description: {
    ...designTokens.typography.body,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.medium,
  },
});

// Basic Stories
export const Default: Story = {
  args: {
    matchResult: createMockMatchResult(),
    onPress: action('card-pressed'),
  },
  render: (args) => (
    <StoryContainer>
      <MatchResultCard {...args} />
    </StoryContainer>
  ),
};

export const BeachVolleyball: Story = {
  args: {
    matchResult: createMockMatchResult({
      matchType: 'beach',
      weatherConditions: 'Sunny, 15km/h wind',
      temperature: 28,
      windSpeed: 15,
    }),
    variant: 'beach',
    onPress: action('beach-card-pressed'),
  },
  render: (args) => (
    <StoryContainer>
      <MatchResultCard {...args} />
    </StoryContainer>
  ),
};

export const IndoorTournament: Story = {
  args: {
    matchResult: createMockMatchResult({
      matchType: 'indoor',
      round: 'Quarter Finals',
      durationSet1: '00:32:45',
      durationSet2: '00:28:15',
    }),
    variant: 'indoor',
    onPress: action('indoor-card-pressed'),
  },
  render: (args) => (
    <StoryContainer>
      <MatchResultCard {...args} />
    </StoryContainer>
  ),
};

export const CompletedMatch: Story = {
  args: {
    matchResult: createMockMatchResult({
      status: 'Finished',
      pointsTeamASet1: 21,
      pointsTeamBSet1: 15,
      pointsTeamASet2: 21,
      pointsTeamBSet2: 18,
      matchPointsA: 2,
      matchPointsB: 0,
      resultStatus: 'synced',
    }),
    onPress: action('completed-card-pressed'),
  },
  render: (args) => (
    <StoryContainer>
      <MatchResultCard {...args} />
    </StoryContainer>
  ),
};

export const SpecialResult: Story = {
  args: {
    matchResult: createMockMatchResult({
      status: 'Finished',
      specialResult: 'forfeit',
      specialResultNotes: 'Team B forfeited due to injury',
      resultStatus: 'confirmed',
    }),
    onPress: action('special-result-pressed'),
  },
  render: (args) => (
    <StoryContainer>
      <MatchResultCard {...args} />
    </StoryContainer>
  ),
};

export const OfflineResult: Story = {
  args: {
    matchResult: createMockMatchResult({
      isOffline: true,
      syncPending: true,
      resultStatus: 'submitted',
    }),
    onPress: action('offline-result-pressed'),
  },
  render: (args) => (
    <StoryContainer>
      <MatchResultCard {...args} />
    </StoryContainer>
  ),
};

// Editable Variants
export const BeachVolleyballEditable: Story = {
  render: () => (
    <StoryContainer>
      <BeachVolleyballResultCard
        matchResult={createMockMatchResult({
          matchType: 'beach',
          status: 'Running',
        })}
        isEditable={true}
        onUpdate={action('beach-result-updated')}
        onSubmit={action('beach-result-submitted')}
      />
    </StoryContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Editable beach volleyball result card with weather conditions and score entry.',
      },
    },
  },
};

export const IndoorTournamentEditable: Story = {
  render: () => (
    <StoryContainer>
      <IndoorTournamentResultCard
        matchResult={createMockMatchResult({
          matchType: 'indoor',
          status: 'Running',
          round: 'Semi Finals',
        })}
        isEditable={true}
        onUpdate={action('indoor-result-updated')}
        onSubmit={action('indoor-result-submitted')}
      />
    </StoryContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Editable indoor tournament result card with extended statistics.',
      },
    },
  },
};

export const QuickResultEntry: Story = {
  render: () => (
    <StoryContainer>
      <QuickResultEntryCard
        matchResult={createMockMatchResult({
          status: 'Scheduled',
          teamAName: 'Quick Team A',
          teamBName: 'Quick Team B',
        })}
        onSubmit={action('quick-result-submitted')}
        onCancel={action('quick-result-cancelled')}
      />
    </StoryContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Quick result entry for time-critical situations with winner selection.',
      },
    },
  },
};

// Score Entry Component
export const ScoreEntryComponent: Story = {
  render: () => (
    <StoryContainer>
      <View style={styles.section}>
        <ScoreEntry
          homeScore={18}
          awayScore={15}
          setNumber={1}
          isCompleted={false}
          isEditable={true}
          onScoreChange={action('score-changed')}
          onSetComplete={action('set-completed')}
        />
      </View>
      
      <View style={styles.section}>
        <ScoreEntry
          homeScore={21}
          awayScore={18}
          setNumber={2}
          isCompleted={true}
          isEditable={false}
          onScoreChange={action('score-changed')}
          onSetComplete={action('set-completed')}
        />
      </View>
    </StoryContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Score entry interface with touch-optimized controls for outdoor conditions.',
      },
    },
  },
};

// Sync Status Indicators
export const SyncStatusVariants: Story = {
  render: () => (
    <StoryContainer>
      <View style={styles.section}>
        <SyncStatusIndicator
          matchResult={createMockMatchResult({ syncPending: true })}
          variant="compact"
          onRetrySync={action('retry-sync')}
        />
      </View>
      
      <View style={styles.section}>
        <SyncStatusIndicator
          matchResult={createMockMatchResult({ 
            resultStatus: 'error',
            isOffline: true 
          })}
          variant="detailed"
          onRetrySync={action('retry-sync')}
          onViewDetails={action('view-details')}
        />
      </View>
      
      <View style={styles.section}>
        <SyncStatusIndicator
          matchResult={createMockMatchResult({ 
            resultStatus: 'submitted',
            syncPending: true 
          })}
          variant="banner"
          onRetrySync={action('retry-sync')}
        />
      </View>
    </StoryContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sync status indicators in different variants: compact, detailed, and banner.',
      },
    },
  },
};

// Result States Collection
export const ResultStatesShowcase: Story = {
  render: () => (
    <StoryContainer>
      <View style={styles.section}>
        <MatchResultCard
          matchResult={createMockMatchResult({
            status: 'Scheduled',
            resultStatus: 'draft',
          })}
          onPress={action('scheduled-pressed')}
        />
      </View>
      
      <View style={styles.section}>
        <MatchResultCard
          matchResult={createMockMatchResult({
            status: 'Running',
            resultStatus: 'draft',
          })}
          onPress={action('running-pressed')}
        />
      </View>
      
      <View style={styles.section}>
        <MatchResultCard
          matchResult={createMockMatchResult({
            status: 'Finished',
            resultStatus: 'submitted',
            syncPending: true,
          })}
          onPress={action('submitted-pressed')}
        />
      </View>
      
      <View style={styles.section}>
        <MatchResultCard
          matchResult={createMockMatchResult({
            status: 'Finished',
            resultStatus: 'synced',
          })}
          onPress={action('synced-pressed')}
        />
      </View>
      
      <View style={styles.section}>
        <MatchResultCard
          matchResult={createMockMatchResult({
            status: 'Cancelled',
            resultStatus: 'error',
          })}
          onPress={action('cancelled-pressed')}
        />
      </View>
    </StoryContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcase of all match result states: scheduled, running, finished, synced, and cancelled.',
      },
    },
  },
};

// Interactive Examples
export const InteractiveResultEntry: Story = {
  render: () => {
    const [matchResult, setMatchResult] = React.useState(
      createMockMatchResult({
        status: 'Running',
        matchType: 'beach',
      })
    );

    return (
      <StoryContainer>
        <BeachVolleyballResultCard
          matchResult={matchResult}
          isEditable={true}
          onUpdate={(updatedResult) => {
            setMatchResult(updatedResult);
            action('result-updated')(updatedResult);
          }}
          onSubmit={action('result-submitted')}
        />
      </StoryContainer>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive result entry with live score updates and validation.',
      },
    },
  },
};