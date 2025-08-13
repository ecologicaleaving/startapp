/**
 * StatusIndicator Storybook Stories
 * Story 2.4: Professional Status Indicator System
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { StatusIndicator } from '../../components/Status/StatusIndicator';
import { AccessibilityStatusIndicator } from '../../components/Status/AccessibilityStatusIndicator';
import { InlineStatusBadge, ProminentStatusDisplay, AnimatedStatusTransition } from '../../components/Status/StatusIndicatorVariants';
import { StatusType, StatusIndicatorSize } from '../../types/status';
import { designTokens } from '../../theme/tokens';

const meta: Meta<typeof StatusIndicator> = {
  title: 'Components/Status/StatusIndicator',
  component: StatusIndicator,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# StatusIndicator Component

Professional status indicator system for tournament referees with comprehensive accessibility support.

## Features

- **Comprehensive Status Types**: Assignment, match, system, and urgency statuses
- **Multiple Variants**: Badge, prominent, icon-only, text-only, and full variants
- **Size System**: Small (24px), medium (32px), and large (44px) with touch target compliance
- **Accessibility**: Color-blind patterns, high contrast mode, screen reader support
- **Real-time Updates**: WebSocket integration for live status changes
- **Animation Support**: Smooth transitions and status change animations

## Usage

\`\`\`tsx
import { StatusIndicator } from '@/components/Status';

// Basic usage
<StatusIndicator type="current" />

// With custom configuration
<StatusIndicator 
  type="in-progress"
  size="large"
  variant="prominent"
  animated={true}
  onPress={() => console.log('Status pressed')}
/>

// Accessibility enhanced
<AccessibilityStatusIndicator
  type="critical"
  colorBlindSupport={true}
  highContrastMode={true}
/>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: [
        'current', 'upcoming', 'completed', 'cancelled', 'changed',
        'pre-match', 'in-progress', 'delayed', 'suspended',
        'online', 'offline', 'sync-pending', 'error',
        'critical', 'warning', 'action-required'
      ],
      description: 'Status type to display',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Size of the status indicator',
    },
    variant: {
      control: 'select',
      options: ['badge', 'prominent', 'icon-only', 'text-only', 'full'],
      description: 'Visual variant of the status indicator',
    },
    animated: {
      control: 'boolean',
      description: 'Enable animations for supported statuses',
    },
    showIcon: {
      control: 'boolean',
      description: 'Show status icon',
    },
    showText: {
      control: 'boolean',
      description: 'Show status text',
    },
    highContrast: {
      control: 'boolean',
      description: 'Enable high contrast mode for outdoor visibility',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the status indicator',
    },
    customLabel: {
      control: 'text',
      description: 'Custom text label for the status',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusIndicator>;

// Basic story
export const Default: Story = {
  args: {
    type: 'current',
    size: 'medium',
    variant: 'full',
    animated: true,
    showIcon: true,
    showText: true,
  },
};

// Status types showcase
export const StatusTypes: Story = {
  render: () => {
    const statusGroups = [
      {
        title: 'Assignment Statuses',
        statuses: ['current', 'upcoming', 'completed', 'cancelled', 'changed'] as StatusType[],
      },
      {
        title: 'Match Statuses',
        statuses: ['pre-match', 'in-progress', 'delayed', 'suspended'] as StatusType[],
      },
      {
        title: 'System Statuses',
        statuses: ['online', 'offline', 'sync-pending', 'error'] as StatusType[],
      },
      {
        title: 'Urgency Statuses',
        statuses: ['critical', 'warning', 'action-required'] as StatusType[],
      },
    ];

    return (
      <ScrollView style={styles.container}>
        {statusGroups.map((group) => (
          <View key={group.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <View style={styles.grid}>
              {group.statuses.map((status) => (
                <View key={status} style={styles.gridItem}>
                  <StatusIndicator
                    type={status}
                    size="medium"
                    variant="full"
                    animated={true}
                  />
                  <Text style={styles.statusLabel}>{status}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'All available status types organized by category.',
      },
    },
  },
};

// Size variations
export const Sizes: Story = {
  render: () => {
    const sizes: StatusIndicatorSize[] = ['small', 'medium', 'large'];
    
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Size Variations</Text>
        <View style={styles.row}>
          {sizes.map((size) => (
            <View key={size} style={styles.sizeItem}>
              <StatusIndicator
                type="current"
                size={size}
                variant="full"
                animated={true}
              />
              <Text style={styles.statusLabel}>{size}</Text>
              <Text style={styles.statusNote}>
                {size === 'small' && '24px'}
                {size === 'medium' && '32px'}
                {size === 'large' && '44px (Touch compliant)'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Different sizes with touch target compliance information.',
      },
    },
  },
};

// Variant showcase
export const Variants: Story = {
  render: () => {
    const variants = [
      { variant: 'badge' as const, description: 'Compact badge for lists' },
      { variant: 'prominent' as const, description: 'Large display for important status' },
      { variant: 'icon-only' as const, description: 'Icon only for space-constrained areas' },
      { variant: 'text-only' as const, description: 'Text only for accessibility' },
      { variant: 'full' as const, description: 'Complete indicator with icon and text' },
    ];

    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Variant Types</Text>
        {variants.map(({ variant, description }) => (
          <View key={variant} style={styles.variantItem}>
            <View style={styles.variantDemo}>
              <StatusIndicator
                type="in-progress"
                size="medium"
                variant={variant}
                animated={true}
              />
            </View>
            <View style={styles.variantInfo}>
              <Text style={styles.variantTitle}>{variant}</Text>
              <Text style={styles.variantDescription}>{description}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Different visual variants for various use cases.',
      },
    },
  },
};

// Accessibility features
export const Accessibility: Story = {
  render: () => (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Color-Blind Support</Text>
        <Text style={styles.description}>
          Patterns help distinguish statuses for color-blind users
        </Text>
        <View style={styles.grid}>
          {(['current', 'upcoming', 'cancelled', 'critical'] as StatusType[]).map((status) => (
            <View key={status} style={styles.gridItem}>
              <AccessibilityStatusIndicator
                type={status}
                size="medium"
                colorBlindSupport={true}
                accessibilityMode={true}
              />
              <Text style={styles.statusLabel}>{status}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>High Contrast Mode</Text>
        <Text style={styles.description}>
          Enhanced visibility for outdoor conditions
        </Text>
        <View style={styles.row}>
          <View style={styles.contrastDemo}>
            <Text style={styles.contrastLabel}>Normal</Text>
            <StatusIndicator
              type="critical"
              size="large"
              variant="prominent"
              highContrast={false}
            />
          </View>
          <View style={styles.contrastDemo}>
            <Text style={styles.contrastLabel}>High Contrast</Text>
            <AccessibilityStatusIndicator
              type="critical"
              size="large"
              variant="prominent"
              highContrastMode={true}
              colorBlindSupport={true}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Accessibility features including color-blind support and high contrast mode.',
      },
    },
  },
};

// Animation showcase
export const Animations: Story = {
  render: () => {
    const [currentStatus, setCurrentStatus] = React.useState<StatusType>('upcoming');
    
    const animatedStatuses: StatusType[] = ['in-progress', 'sync-pending', 'critical'];
    
    React.useEffect(() => {
      const interval = setInterval(() => {
        setCurrentStatus(prev => {
          const statuses: StatusType[] = ['upcoming', 'current', 'in-progress', 'completed'];
          const currentIndex = statuses.indexOf(prev);
          return statuses[(currentIndex + 1) % statuses.length];
        });
      }, 3000);
      
      return () => clearInterval(interval);
    }, []);

    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Animated Statuses</Text>
          <Text style={styles.description}>
            These statuses automatically animate to draw attention
          </Text>
          <View style={styles.row}>
            {animatedStatuses.map((status) => (
              <View key={status} style={styles.animationItem}>
                <StatusIndicator
                  type={status}
                  size="large"
                  variant="prominent"
                  animated={true}
                />
                <Text style={styles.statusLabel}>{status}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Transition</Text>
          <Text style={styles.description}>
            Smooth transition between status changes
          </Text>
          <View style={styles.transitionDemo}>
            <AnimatedStatusTransition
              toStatus={currentStatus}
              size="large"
              duration={500}
            />
            <Text style={styles.statusLabel}>Current: {currentStatus}</Text>
          </View>
        </View>
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Animation features including auto-animation and status transitions.',
      },
    },
  },
};

// Interactive examples
export const Interactive: Story = {
  render: () => {
    const [selectedStatus, setSelectedStatus] = React.useState<StatusType>('current');
    const [isPressed, setIsPressed] = React.useState(false);
    
    const interactiveStatuses: StatusType[] = [
      'current', 'upcoming', 'completed', 'in-progress', 'critical'
    ];

    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interactive Status Selector</Text>
          <Text style={styles.description}>
            Tap to change status - simulates real-time updates
          </Text>
          
          <View style={styles.interactiveDemo}>
            <StatusIndicator
              type={selectedStatus}
              size="large"
              variant="prominent"
              animated={true}
              onPress={() => setIsPressed(!isPressed)}
            />
            <Text style={styles.statusLabel}>
              Selected: {selectedStatus} {isPressed ? '(Pressed)' : ''}
            </Text>
          </View>
          
          <View style={styles.buttonRow}>
            {interactiveStatuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  selectedStatus === status && styles.selectedButton
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <StatusIndicator
                  type={status}
                  size="small"
                  variant="badge"
                />
                <Text style={styles.buttonText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive examples demonstrating real-time status changes.',
      },
    },
  },
};

// Usage in context
export const InContext: Story = {
  render: () => (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In Assignment Card</Text>
        <View style={styles.contextCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Court 1 - Beach Volleyball</Text>
            <InlineStatusBadge type="current" size="small" />
          </View>
          <Text style={styles.cardContent}>
            Match: Team A vs Team B{'\n'}
            Time: 14:30 - 16:00{'\n'}
            Referee: John Smith
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In Match Result Card</Text>
        <View style={styles.contextCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Match Results</Text>
          </View>
          <View style={styles.cardContent}>
            <StatusIndicator
              type="in-progress"
              size="medium"
              variant="full"
              animated={true}
            />
            <Text style={styles.cardText}>
              Set 1: 21-18, Set 2: In Progress (15-12)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In Tournament Panel</Text>
        <View style={styles.contextCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tournament Status</Text>
            <View style={styles.statusRow}>
              <StatusIndicator
                type="online"
                size="small"
                variant="icon-only"
              />
              <StatusIndicator
                type="sync-pending"
                size="small"
                variant="badge"
                animated={true}
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status indicators used in realistic interface contexts.',
      },
    },
  },
};

const styles = StyleSheet.create({
  container: {
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.background,
  },
  section: {
    marginBottom: designTokens.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  description: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.md,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.md,
  },
  gridItem: {
    alignItems: 'center',
    minWidth: 100,
    marginBottom: designTokens.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: designTokens.spacing.lg,
    alignItems: 'center',
  },
  sizeItem: {
    alignItems: 'center',
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
  },
  statusLabel: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginTop: designTokens.spacing.xs,
    textAlign: 'center',
  },
  statusNote: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
    marginBottom: designTokens.spacing.sm,
  },
  variantDemo: {
    width: 80,
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
  },
  variantInfo: {
    flex: 1,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  variantDescription: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    lineHeight: 20,
  },
  contrastDemo: {
    alignItems: 'center',
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
  },
  contrastLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  animationItem: {
    alignItems: 'center',
    padding: designTokens.spacing.md,
  },
  transitionDemo: {
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
  },
  interactiveDemo: {
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
    marginBottom: designTokens.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
    gap: designTokens.spacing.xs,
  },
  selectedButton: {
    borderColor: designTokens.colors.accent,
    backgroundColor: designTokens.colors.accent + '10',
  },
  buttonText: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  contextCard: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    padding: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  cardText: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
});

// Additional interactive story for Storybook controls
export const Playground: Story = {
  args: {
    type: 'current',
    size: 'medium',
    variant: 'full',
    animated: true,
    showIcon: true,
    showText: true,
    highContrast: false,
    disabled: false,
    customLabel: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive playground to test all props and configurations.',
      },
    },
  },
};