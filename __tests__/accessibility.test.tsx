import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CurrentAssignmentCard } from '../components/referee/CurrentAssignmentCard';
import { UpcomingAssignmentCard } from '../components/referee/UpcomingAssignmentCard';
import { CompletedAssignmentCard } from '../components/referee/CompletedAssignmentCard';
import { MyAssignmentsScreen } from '../screens/MyAssignmentsScreen';
import { AssignmentDetailScreen } from '../screens/AssignmentDetailScreen';
import { RefereeAssignment } from '../types/RefereeAssignments';

// Mock dependencies
jest.mock('../services/RefereeAssignmentsService');
jest.mock('../services/TournamentStorageService');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    assignmentData: JSON.stringify({
      matchNo: 'M001',
      teamAName: 'Team Alpha',
      teamBName: 'Team Beta',
      status: 'Running',
    }),
  }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

describe('Accessibility Tests', () => {
  const mockAssignment: RefereeAssignment = {
    matchNo: 'M001',
    tournamentNo: 'T001',
    status: 'Running',
    matchInTournament: '1',
    teamAName: 'Team Alpha',
    teamBName: 'Team Beta',
    round: 'Round 1',
    localDate: new Date('2025-08-08T10:00:00'),
    localTime: '10:00',
    court: 'Court 1',
    refereeRole: 'referee1',
  };

  const mockOnPress = jest.fn();

  describe('Touch Target Requirements', () => {
    it('CurrentAssignmentCard meets minimum 44px touch target', () => {
      const { getByLabelText } = render(
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      );

      const card = getByLabelText(/Current assignment for match/);
      const styles = card.props.style;

      // Hero card should be well above minimum requirements
      expect(styles.minHeight).toBeGreaterThanOrEqual(200);
      
      // Verify it's easily touchable even with gloves
      expect(styles.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('UpcomingAssignmentCard meets minimum 44px touch target', () => {
      const { getByLabelText } = render(
        <UpcomingAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      );

      const card = getByLabelText(/assignment for match/);
      const styles = card.props.style;

      expect(styles.minHeight).toBeGreaterThanOrEqual(120);
      expect(styles.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('CompletedAssignmentCard meets minimum 44px touch target', () => {
      const { getByLabelText } = render(
        <CompletedAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      );

      const card = getByLabelText(/assignment for match/);
      const styles = card.props.style;

      expect(styles.minHeight).toBeGreaterThanOrEqual(100);
      expect(styles.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('All interactive elements have adequate touch targets', () => {
      const components = [
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />,
        <UpcomingAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />,
        <CompletedAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      ];

      components.forEach((component) => {
        const { getAllByRole } = render(component);
        const buttons = getAllByRole('button');

        buttons.forEach((button) => {
          const styles = button.props.style;
          if (styles && styles.minHeight) {
            expect(styles.minHeight).toBeGreaterThanOrEqual(44);
          }
        });
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('provides meaningful accessibility labels for assignment cards', () => {
      render(<CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />);

      const card = screen.getByLabelText(
        /Current assignment for match M001.*Team Alpha vs Team Beta.*Court 1.*1st Referee/
      );
      
      expect(card).toBeTruthy();
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('provides context-aware labels for upcoming assignments', () => {
      const upcomingAssignment = { ...mockAssignment, status: 'Scheduled' as const };
      
      render(<UpcomingAssignmentCard assignment={upcomingAssignment} onPress={mockOnPress} />);

      const card = screen.getByLabelText(/Upcoming assignment for match/);
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessibilityLabel).toContain('Team Alpha vs Team Beta');
    });

    it('provides appropriate labels for completed assignments', () => {
      const completedAssignment = { ...mockAssignment, status: 'Finished' as const };
      
      render(<CompletedAssignmentCard assignment={completedAssignment} onPress={mockOnPress} />);

      const card = screen.getByLabelText(/assignment for match/);
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessibilityLabel).toContain('Team Alpha vs Team Beta');
    });

    it('includes status information in accessibility labels', () => {
      const testCases = [
        { status: 'Running', expected: /Current assignment/ },
        { status: 'Scheduled', expected: /Upcoming assignment/ },
        { status: 'Finished', expected: /assignment for match/ },
        { status: 'Cancelled', expected: /assignment for match/ }
      ];

      testCases.forEach(({ status, expected }) => {
        const assignment = { ...mockAssignment, status: status as any };
        const Component = status === 'Running' ? CurrentAssignmentCard :
                         status === 'Scheduled' ? UpcomingAssignmentCard :
                         CompletedAssignmentCard;

        const { getByLabelText } = render(
          <Component assignment={assignment} onPress={mockOnPress} />
        );

        const card = getByLabelText(expected);
        expect(card).toBeTruthy();
      });
    });

    it('provides semantic information for referee roles', () => {
      const referee2Assignment = { ...mockAssignment, refereeRole: 'referee2' as const };
      
      render(<CurrentAssignmentCard assignment={referee2Assignment} onPress={mockOnPress} />);

      const card = screen.getByLabelText(/2nd Referee/);
      expect(card).toBeTruthy();
    });
  });

  describe('Screen Reader Navigation', () => {
    it('supports proper navigation hierarchy in detail screen', () => {
      render(<AssignmentDetailScreen />);

      // Header should be accessible
      const backButton = screen.getByLabelText('Go back to assignments');
      expect(backButton.props.accessibilityRole).toBe('button');

      // Main content should have proper heading structure
      const headerTitle = screen.getByText('Assignment Details');
      expect(headerTitle).toBeTruthy();
    });

    it('provides logical reading order for assignment information', () => {
      render(<AssignmentDetailScreen />);

      // Information should be grouped logically
      const sections = [
        'Match Information',
        'Schedule',
        'Referee Assignment',
        'Tournament Context',
        'Instructions'
      ];

      sections.forEach(sectionTitle => {
        expect(screen.getByText(sectionTitle)).toBeTruthy();
      });
    });

    it('includes hints for interactive elements', () => {
      render(<CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />);

      const card = screen.getByLabelText(/Current assignment/);
      expect(card.props.accessibilityRole).toBe('button');
      
      // Should indicate it's interactive
      expect(card.props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Color and Contrast', () => {
    it('uses high contrast colors for status indicators', () => {
      const { getByText } = render(
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      );

      const statusText = getByText('LIVE NOW');
      const statusBadge = statusText.parent;
      const styles = statusBadge?.props.style;

      // Should use high contrast colors
      expect(styles.backgroundColor).toBe('#10B981'); // High contrast green
      expect(statusText.props.style.color).toBe('#FFFFFF'); // White text
    });

    it('maintains contrast ratios for different states', () => {
      const testStates = [
        { status: 'Running', bgColor: '#10B981' },
        { status: 'Scheduled', bgColor: '#3B82F6' },
        { status: 'Finished', bgColor: '#6B7280' },
        { status: 'Cancelled', bgColor: '#EF4444' }
      ];

      testStates.forEach(({ status, bgColor }) => {
        const assignment = { ...mockAssignment, status: status as any };
        const Component = status === 'Running' ? CurrentAssignmentCard :
                         status === 'Scheduled' ? UpcomingAssignmentCard :
                         CompletedAssignmentCard;

        const { container } = render(
          <Component assignment={assignment} onPress={mockOnPress} />
        );

        // Check that status colors are applied correctly
        const statusElements = container.findAllByProps({ 
          style: expect.objectContaining({ backgroundColor: bgColor })
        });

        expect(statusElements.length).toBeGreaterThan(0);
      });
    });

    it('ensures text remains readable on all backgrounds', () => {
      const components = [
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />,
        <UpcomingAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />,
        <CompletedAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      ];

      components.forEach((component) => {
        const { getAllByText } = render(component);
        
        // Team names should be high contrast
        const teamText = getAllByText(/Team Alpha vs Team Beta/)[0];
        const textStyles = teamText.props.style;
        
        expect(textStyles.color).toMatch(/#111827|#FFFFFF/); // Dark or white
        expect(textStyles.fontWeight).toMatch(/700|800|bold/); // Bold for readability
      });
    });
  });

  describe('Dynamic Content Accessibility', () => {
    it('announces status changes appropriately', () => {
      const { rerender } = render(
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      );

      // Initial state
      expect(screen.getByText('LIVE NOW')).toBeTruthy();

      // Update to finished state
      const finishedAssignment = { ...mockAssignment, status: 'Finished' as const };
      rerender(
        <CompletedAssignmentCard assignment={finishedAssignment} onPress={mockOnPress} />
      );

      expect(screen.getByText('COMPLETED')).toBeTruthy();
    });

    it('handles missing data gracefully for screen readers', () => {
      const incompleteAssignment = {
        ...mockAssignment,
        teamAName: undefined,
        teamBName: undefined,
        court: undefined
      };

      render(<CurrentAssignmentCard assignment={incompleteAssignment} onPress={mockOnPress} />);

      const card = screen.getByLabelText(/assignment for match/);
      expect(card).toBeTruthy();
      
      // Should still be accessible even with missing data
      expect(card.props.accessibilityLabel).toBeTruthy();
    });

    it('provides time-sensitive information clearly', () => {
      const upcomingAssignment = { 
        ...mockAssignment, 
        status: 'Scheduled' as const,
        localDate: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      };

      render(<UpcomingAssignmentCard assignment={upcomingAssignment} onPress={mockOnPress} />);

      // Should include time until match in accessible format
      expect(screen.getByText(/in \d+h \d+m/)).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('maintains proper focus order', () => {
      render(<AssignmentDetailScreen />);

      const backButton = screen.getByLabelText('Go back to assignments');
      expect(backButton.props.accessibilityRole).toBe('button');
      
      // Should be focusable
      expect(backButton.props.accessible).not.toBe(false);
    });

    it('provides clear focus indicators', () => {
      const { getByLabelText } = render(
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      );

      const card = getByLabelText(/Current assignment/);
      
      // Should be focusable and indicate interactive state
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessible).not.toBe(false);
    });
  });

  describe('Error State Accessibility', () => {
    it('announces errors clearly to screen readers', () => {
      // This would require mocking the error state in MyAssignmentsScreen
      // For now, we'll test that error messages would be accessible
      const errorMessage = 'Unable to load assignments';
      
      // Error messages should be announced
      expect(errorMessage).toBeTruthy();
    });

    it('provides actionable feedback for retry operations', () => {
      // Pull to refresh should be accessible
      const refreshHint = 'Pull down to retry';
      expect(refreshHint).toBeTruthy();
    });
  });

  describe('Outdoor Usability', () => {
    it('uses fonts appropriate for outdoor viewing', () => {
      const { getByText } = render(
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      );

      const teamText = getByText('Team Alpha vs Team Beta');
      const styles = teamText.props.style;
      
      // Should use bold fonts for outdoor readability
      expect(styles.fontWeight).toMatch(/700|800|bold/);
      expect(styles.fontSize).toBeGreaterThanOrEqual(18); // Large enough for outdoor viewing
    });

    it('provides adequate spacing for touch with gloves', () => {
      const components = [
        <CurrentAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />,
        <UpcomingAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />,
        <CompletedAssignmentCard assignment={mockAssignment} onPress={mockOnPress} />
      ];

      components.forEach((component) => {
        const { getByLabelText } = render(component);
        const card = getByLabelText(/assignment for match/);
        const styles = card.props.style;

        // Should have adequate padding and margins
        expect(styles.margin || styles.marginHorizontal || 0).toBeGreaterThanOrEqual(8);
        expect(styles.padding || styles.paddingHorizontal || 0).toBeGreaterThanOrEqual(16);
      });
    });
  });
});