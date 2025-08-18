import React from 'react';
import { render } from '@testing-library/react-native';
import { MatchCard } from '../../components/referee/MatchCard';
import { BeachMatch } from '../../types/match';

describe('MatchCard', () => {
  const mockMatch: BeachMatch = {
    No: 'MATCH_1',
    NoInTournament: '12',
    LocalDate: '2025-01-15',
    LocalTime: '14:30',
    Court: '1',
    TeamAName: 'Team Alpha',
    TeamBName: 'Team Beta',
    MatchPointsA: '2',
    MatchPointsB: '1',
    Status: 'Completed',
    Referee1Name: 'John Doe',
    Referee1FederationCode: 'USA',
    Referee2Name: 'Jane Smith',
    Referee2FederationCode: 'GBR',
    tournamentGender: 'M',
  };

  const mockSelectedReferee = {
    No: 'REF_1',
    Name: 'John Doe',
    FederationCode: 'USA',
  };

  describe('rendering', () => {
    it('should render match information correctly', () => {
      const { getByText } = render(<MatchCard match={mockMatch} />);

      expect(getByText('#12')).toBeTruthy();
      expect(getByText('Court 1')).toBeTruthy();
      expect(getByText('14:30')).toBeTruthy();
      expect(getByText('Jan 15')).toBeTruthy();
      expect(getByText('Team Alpha')).toBeTruthy();
      expect(getByText('Team Beta')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
    });

    it('should render referee information', () => {
      const { getByText } = render(<MatchCard match={mockMatch} />);

      expect(getByText('1° John Doe (USA)')).toBeTruthy();
      expect(getByText('2° Jane Smith (GBR)')).toBeTruthy();
    });

    it('should highlight selected referee', () => {
      const { getByText } = render(
        <MatchCard match={mockMatch} selectedReferee={mockSelectedReferee} />
      );

      const refereeText = getByText('1° John Doe (USA)');
      expect(refereeText.props.style).toEqual(
        expect.objectContaining({ fontWeight: 'bold' })
      );
    });

    it('should not highlight non-selected referee', () => {
      const { getByText } = render(
        <MatchCard match={mockMatch} selectedReferee={mockSelectedReferee} />
      );

      const refereeText = getByText('2° Jane Smith (GBR)');
      expect(refereeText.props.style).not.toEqual(
        expect.objectContaining({ fontWeight: 'bold' })
      );
    });

    it('should show gender strip for male tournament', () => {
      const { UNSAFE_getByType } = render(<MatchCard match={mockMatch} />);
      
      // Look for gender strip with male styling
      const genderStrips = UNSAFE_getByType('View').props.children.filter(
        (child: any) => child?.props?.style?.backgroundColor === '#87CEEB'
      );
      expect(genderStrips.length).toBeGreaterThan(0);
    });

    it('should show gender strip for female tournament', () => {
      const femaleMatch = { ...mockMatch, tournamentGender: 'W' };
      const { UNSAFE_getByType } = render(<MatchCard match={femaleMatch} />);
      
      // Look for gender strip with female styling
      const genderStrips = UNSAFE_getByType('View').props.children.filter(
        (child: any) => child?.props?.style?.backgroundColor === '#FFB6C1'
      );
      expect(genderStrips.length).toBeGreaterThan(0);
    });

    it('should not show gender strip when disabled', () => {
      const { queryByTestId } = render(
        <MatchCard match={mockMatch} showGenderStrip={false} />
      );

      expect(queryByTestId('gender-strip')).toBeNull();
    });
  });

  describe('fallback values', () => {
    it('should handle missing match information', () => {
      const incompleteMatch: BeachMatch = {
        No: 'MATCH_2',
        TeamAName: undefined,
        TeamBName: undefined,
        LocalTime: undefined,
        LocalDate: undefined,
        Court: undefined,
        MatchPointsA: undefined,
        MatchPointsB: undefined,
      };

      const { getByText } = render(<MatchCard match={incompleteMatch} />);

      expect(getByText('Team A')).toBeTruthy();
      expect(getByText('Team B')).toBeTruthy();
      expect(getByText('TBD')).toBeTruthy();
      expect(getByText('Court TBD')).toBeTruthy();
      expect(getByText('0')).toBeTruthy();
    });

    it('should handle missing referee information', () => {
      const matchWithoutReferees: BeachMatch = {
        ...mockMatch,
        Referee1Name: undefined,
        Referee2Name: undefined,
      };

      const { queryByText } = render(<MatchCard match={matchWithoutReferees} />);

      expect(queryByText(/1°/)).toBeNull();
      expect(queryByText(/2°/)).toBeNull();
    });
  });

  describe('winner highlighting', () => {
    it('should highlight team A when they win', () => {
      const { getByText } = render(<MatchCard match={mockMatch} />);

      const teamAContainer = getByText('Team Alpha').parent;
      expect(teamAContainer?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F0F9FF' })
        ])
      );
    });

    it('should highlight team B when they win', () => {
      const teamBWinMatch = { ...mockMatch, MatchPointsA: '1', MatchPointsB: '2' };
      const { getByText } = render(<MatchCard match={teamBWinMatch} />);

      const teamBContainer = getByText('Team Beta').parent;
      expect(teamBContainer?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F0F9FF' })
        ])
      );
    });

    it('should not highlight any team for draw', () => {
      const drawMatch = { ...mockMatch, MatchPointsA: '1', MatchPointsB: '1' };
      const { getByText } = render(<MatchCard match={drawMatch} />);

      const teamAContainer = getByText('Team Alpha').parent;
      const teamBContainer = getByText('Team Beta').parent;

      expect(teamAContainer?.props.style).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F0F9FF' })
        ])
      );
      expect(teamBContainer?.props.style).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F0F9FF' })
        ])
      );
    });
  });
});