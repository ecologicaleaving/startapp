import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { CurrentAssignmentCard } from '../CurrentAssignmentCard';
import { UpcomingAssignmentCard } from '../UpcomingAssignmentCard';
import { CompletedAssignmentCard } from '../CompletedAssignmentCard';
import { RefereeAssignment } from '../../../types/RefereeAssignments';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Assignment Cards', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CurrentAssignmentCard', () => {
    it('renders current assignment correctly', () => {
      render(
        <CurrentAssignmentCard 
          assignment={mockAssignment} 
          onPress={mockOnPress} 
        />
      );

      expect(screen.getByText('LIVE NOW')).toBeTruthy();
      expect(screen.getByText('Team Alpha vs Team Beta')).toBeTruthy();
      expect(screen.getByText('Match #1')).toBeTruthy();
      expect(screen.getByText('Court 1')).toBeTruthy();
      expect(screen.getByText('10:00')).toBeTruthy();
      expect(screen.getByText('1st Referee')).toBeTruthy();
    });

    it('handles press events', () => {
      render(
        <CurrentAssignmentCard 
          assignment={mockAssignment} 
          onPress={mockOnPress} 
        />
      );

      const card = screen.getByLabelText(/Current assignment for match/);
      fireEvent.press(card);
      
      expect(mockOnPress).toHaveBeenCalledWith(mockAssignment);
    });

    it('displays correct referee role for referee2', () => {
      const referee2Assignment = { ...mockAssignment, refereeRole: 'referee2' as const };
      
      render(
        <CurrentAssignmentCard 
          assignment={referee2Assignment} 
          onPress={mockOnPress} 
        />
      );

      expect(screen.getByText('2nd Referee')).toBeTruthy();
    });

    it('handles missing team names gracefully', () => {
      const incompleteAssignment = { 
        ...mockAssignment, 
        teamAName: 'TBD', 
        teamBName: 'TBD' 
      };
      
      render(
        <CurrentAssignmentCard 
          assignment={incompleteAssignment} 
          onPress={mockOnPress} 
        />
      );

      expect(screen.getByText('TBD vs TBD')).toBeTruthy();
    });

    it('meets minimum touch target requirements', () => {
      const { getByLabelText } = render(
        <CurrentAssignmentCard 
          assignment={mockAssignment} 
          onPress={mockOnPress} 
        />
      );

      const touchTarget = getByLabelText(/Current assignment for match/);
      const style = touchTarget.props.style;
      
      // Card should have minimum 44px height for touch targets
      expect(style).toEqual(expect.objectContaining({
        minHeight: 200, // Hero card is larger than minimum
      }));
    });
  });

  describe('UpcomingAssignmentCard', () => {
    const upcomingAssignment = { 
      ...mockAssignment, 
      status: 'Scheduled' as const,
      localDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    };

    it('renders upcoming assignment correctly', () => {
      render(
        <UpcomingAssignmentCard 
          assignment={upcomingAssignment} 
          onPress={mockOnPress} 
        />
      );

      expect(screen.getByText('UPCOMING')).toBeTruthy();
      expect(screen.getByText('Team Alpha vs Team Beta')).toBeTruthy();
      expect(screen.getByText(/in \d+h \d+m/)).toBeTruthy(); // Time until match
    });

    it('calculates time until match correctly', () => {
      const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now
      const futureAssignment = { 
        ...upcomingAssignment, 
        localDate: futureDate 
      };

      render(
        <UpcomingAssignmentCard 
          assignment={futureAssignment} 
          onPress={mockOnPress} 
        />
      );

      expect(screen.getByText(/in 3h 0m/)).toBeTruthy();
    });

    it('handles past dates gracefully', () => {
      const pastAssignment = { 
        ...upcomingAssignment, 
        localDate: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      };

      render(
        <UpcomingAssignmentCard 
          assignment={pastAssignment} 
          onPress={mockOnPress} 
        />
      );

      // Should not crash and display basic information
      expect(screen.getByText('Team Alpha vs Team Beta')).toBeTruthy();
    });

    it('meets touch target requirements', () => {
      const { getByLabelText } = render(
        <UpcomingAssignmentCard 
          assignment={upcomingAssignment} 
          onPress={mockOnPress} 
        />
      );

      const touchTarget = getByLabelText(/Upcoming assignment for match/);
      const style = touchTarget.props.style;
      
      expect(style).toEqual(expect.objectContaining({
        minHeight: 120,
      }));
    });
  });

  describe('CompletedAssignmentCard', () => {
    const completedAssignment = { 
      ...mockAssignment, 
      status: 'Finished' as const,
      localDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    };

    it('renders completed assignment correctly', () => {
      render(
        <CompletedAssignmentCard 
          assignment={completedAssignment} 
          onPress={mockOnPress} 
        />
      );

      expect(screen.getByText('COMPLETED')).toBeTruthy();
      expect(screen.getByText('Team Alpha vs Team Beta')).toBeTruthy();
    });

    it('handles cancelled assignments', () => {
      const cancelledAssignment = { 
        ...completedAssignment, 
        status: 'Cancelled' as const 
      };

      render(
        <CompletedAssignmentCard 
          assignment={cancelledAssignment} 
          onPress={mockOnPress} 
        />
      );

      expect(screen.getByText('CANCELLED')).toBeTruthy();
    });

    it('applies muted styling for completed assignments', () => {
      const { getByLabelText } = render(
        <CompletedAssignmentCard 
          assignment={completedAssignment} 
          onPress={mockOnPress} 
        />
      );

      const card = getByLabelText(/assignment for match/);
      const style = card.props.style;
      
      // Should have reduced opacity for muted appearance
      expect(style).toEqual(expect.objectContaining({
        opacity: 0.8,
      }));
    });
  });

  describe('Accessibility Features', () => {
    it('provides appropriate accessibility labels', () => {
      render(
        <CurrentAssignmentCard 
          assignment={mockAssignment} 
          onPress={mockOnPress} 
        />
      );

      const card = screen.getByLabelText(/Current assignment for match M001/);
      expect(card).toBeTruthy();
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('supports screen reader navigation', () => {
      render(
        <UpcomingAssignmentCard 
          assignment={mockAssignment} 
          onPress={mockOnPress} 
        />
      );

      const card = screen.getByLabelText(/assignment for match/);
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('provides semantic information in labels', () => {
      render(
        <CurrentAssignmentCard 
          assignment={mockAssignment} 
          onPress={mockOnPress} 
        />
      );

      const label = screen.getByLabelText(/Current assignment for match M001.*Team Alpha vs Team Beta.*Court 1.*1st Referee/);
      expect(label).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles undefined assignment gracefully', () => {
      const { container } = render(
        <CurrentAssignmentCard 
          assignment={{} as RefereeAssignment} 
          onPress={mockOnPress} 
        />
      );

      // Should not crash
      expect(container).toBeTruthy();
    });

    it('handles missing onPress callback', () => {
      render(
        <CurrentAssignmentCard 
          assignment={mockAssignment} 
          onPress={undefined as any} 
        />
      );

      const card = screen.getByLabelText(/assignment for match/);
      
      // Should not crash when pressed without callback
      expect(() => fireEvent.press(card)).not.toThrow();
    });

    it('handles invalid date objects', () => {
      const invalidDateAssignment = { 
        ...mockAssignment, 
        localDate: new Date('invalid date') 
      };

      render(
        <UpcomingAssignmentCard 
          assignment={invalidDateAssignment} 
          onPress={mockOnPress} 
        />
      );

      // Should render without crashing
      expect(screen.getByText('Team Alpha vs Team Beta')).toBeTruthy();
    });
  });

  describe('Visual Consistency', () => {
    it('uses high-contrast colors for outdoor visibility', () => {
      const { getByText } = render(
        <CurrentAssignmentCard 
          assignment={mockAssignment} 
          onPress={mockOnPress} 
        />
      );

      const statusBadge = getByText('LIVE NOW');
      const style = statusBadge.parent?.props.style;
      
      // Should use high-contrast green for current assignments
      expect(style).toEqual(expect.objectContaining({
        backgroundColor: '#10B981',
      }));
    });

    it('maintains consistent card styling', () => {
      const cards = [
        <CurrentAssignmentCard key="current" assignment={mockAssignment} onPress={mockOnPress} />,
        <UpcomingAssignmentCard key="upcoming" assignment={mockAssignment} onPress={mockOnPress} />,
        <CompletedAssignmentCard key="completed" assignment={mockAssignment} onPress={mockOnPress} />
      ];

      cards.forEach((card) => {
        const { getByLabelText } = render(card);
        const cardElement = getByLabelText(/assignment for match/);
        const style = cardElement.props.style;
        
        // All cards should have consistent border radius and elevation
        expect(style).toEqual(expect.objectContaining({
          borderRadius: 16,
          elevation: 4,
        }));
      });
    });
  });
});