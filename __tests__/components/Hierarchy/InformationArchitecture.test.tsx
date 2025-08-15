/**
 * Information Architecture Tests
 * Comprehensive testing for referee-first hierarchy patterns
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  HierarchyContainer,
  InfoGroup,
  HeroContent,
  InformationClassifier,
  type InformationPriority,
  type ClassifiableContentType
} from '@/components/Hierarchy/InformationArchitecture';

describe('InformationArchitecture', () => {
  describe('HierarchyContainer', () => {
    it('renders primary information with correct styling', () => {
      render(
        <HierarchyContainer priority="primary">
          <text>Primary Content</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Primary Content').parent;
      expect(container).toHaveStyle({
        borderWidth: 2,
        elevation: 6,
      });
    });

    it('renders secondary information with reduced visual weight', () => {
      render(
        <HierarchyContainer priority="secondary">
          <text>Secondary Content</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Secondary Content').parent;
      expect(container).toHaveStyle({
        borderWidth: 1,
        elevation: 3,
      });
    });

    it('renders tertiary information with minimal visual weight', () => {
      render(
        <HierarchyContainer priority="tertiary">
          <text>Tertiary Content</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Tertiary Content').parent;
      expect(container).toHaveStyle({
        borderWidth: 0,
        opacity: 0.95,
      });
    });

    it('applies hero weight styling when specified', () => {
      render(
        <HierarchyContainer priority="primary" visualWeight="hero">
          <text>Hero Content</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Hero Content').parent;
      expect(container).toHaveStyle({
        borderWidth: 3,
        elevation: 8,
      });
    });

    it('optimizes for scanning when enabled', () => {
      render(
        <HierarchyContainer priority="primary" scanOptimized={true}>
          <text>Scan Optimized</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Scan Optimized').parent;
      expect(container).toHaveStyle({
        minHeight: 44, // accessibility touch target
        justifyContent: 'center',
      });
    });
  });

  describe('InfoGroup', () => {
    it('renders with visual separation when enabled', () => {
      render(
        <InfoGroup priority="secondary" separated={true}>
          <text>Separated Content</text>
        </InfoGroup>
      );
      
      const group = screen.getByText('Separated Content').parent;
      expect(group).toHaveStyle({
        borderBottomWidth: 1,
        paddingBottom: expect.any(Number),
        marginBottom: expect.any(Number),
      });
    });

    it('applies priority-specific group styling', () => {
      render(
        <InfoGroup priority="primary">
          <text>Primary Group</text>
        </InfoGroup>
      );
      
      const group = screen.getByText('Primary Group').parent;
      expect(group).toHaveStyle({
        marginBottom: expect.any(Number), // Should be larger for primary
      });
    });
  });

  describe('HeroContent', () => {
    it('renders with maximum prominence by default', () => {
      render(
        <HeroContent>
          <text>Hero Text</text>
        </HeroContent>
      );
      
      const hero = screen.getByText('Hero Text').parent;
      expect(hero).toHaveStyle({
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
      });
    });

    it('applies context-sensitive styling when enabled', () => {
      render(
        <HeroContent contextSensitive={true}>
          <text>Context Hero</text>
        </HeroContent>
      );
      
      const hero = screen.getByText('Context Hero').parent;
      // Should have accent border color for context sensitivity
      expect(hero).toHaveStyle({
        borderColor: expect.any(String),
      });
    });

    it('adjusts prominence levels correctly', () => {
      const { rerender } = render(
        <HeroContent prominence="standard">
          <text>Standard Hero</text>
        </HeroContent>
      );
      
      let hero = screen.getByText('Standard Hero').parent;
      expect(hero).not.toHaveStyle({ minHeight: 120 });

      rerender(
        <HeroContent prominence="maximum">
          <text>Maximum Hero</text>
        </HeroContent>
      );
      
      hero = screen.getByText('Maximum Hero').parent;
      expect(hero).toHaveStyle({ minHeight: 120 });
    });
  });

  describe('InformationClassifier', () => {
    it('classifies current assignment as primary', () => {
      const priority = InformationClassifier.classifyContent('currentAssignment');
      expect(priority).toBe('primary');
    });

    it('classifies time critical data as primary', () => {
      const priority = InformationClassifier.classifyContent('timeCritical');
      expect(priority).toBe('primary');
    });

    it('classifies tournament context as secondary', () => {
      const priority = InformationClassifier.classifyContent('tournamentContext');
      expect(priority).toBe('secondary');
    });

    it('classifies match details as secondary', () => {
      const priority = InformationClassifier.classifyContent('matchDetails');
      expect(priority).toBe('secondary');
    });

    it('classifies statistics as tertiary', () => {
      const priority = InformationClassifier.classifyContent('statistics');
      expect(priority).toBe('tertiary');
    });

    it('classifies administrative details as tertiary', () => {
      const priority = InformationClassifier.classifyContent('administrativeDetails');
      expect(priority).toBe('tertiary');
    });

    it('returns correct hierarchy specifications for each priority', () => {
      const primarySpecs = InformationClassifier.getHierarchySpecs('primary');
      expect(primarySpecs.fontSize).toBe(20);
      expect(primarySpecs.fontWeight).toBe('bold');

      const secondarySpecs = InformationClassifier.getHierarchySpecs('secondary');
      expect(secondarySpecs.fontSize).toBe(16);
      expect(secondarySpecs.fontWeight).toBe('600');

      const tertiarySpecs = InformationClassifier.getHierarchySpecs('tertiary');
      expect(tertiarySpecs.fontSize).toBe(14);
      expect(tertiarySpecs.fontWeight).toBe('normal');
    });
  });

  describe('Referee Workflow Integration', () => {
    it('prioritizes referee assignments over general information', () => {
      const assignmentPriority = InformationClassifier.classifyContent('currentAssignment' as ClassifiableContentType);
      const generalPriority = InformationClassifier.classifyContent('generalTournament' as ClassifiableContentType);
      
      expect(assignmentPriority).toBe('primary');
      expect(generalPriority).toBe('tertiary');
    });

    it('maintains consistent visual hierarchy across components', () => {
      const { rerender } = render(
        <HierarchyContainer priority="primary">
          <text>Primary Test</text>
        </HierarchyContainer>
      );

      const primaryContainer = screen.getByText('Primary Test').parent;
      const primarySpecs = InformationClassifier.getHierarchySpecs('primary');

      rerender(
        <InfoGroup priority="primary">
          <text>Primary Group</text>
        </InfoGroup>
      );

      const primaryGroup = screen.getByText('Primary Group').parent;
      
      // Both should follow primary priority styling patterns
      expect(primaryContainer).toHaveStyle({
        borderWidth: 2,
        elevation: 6,
      });
      // Group should have appropriate margin for primary content
      expect(primaryGroup).toHaveStyle({
        marginBottom: expect.any(Number),
      });
    });
  });

  describe('Accessibility and Outdoor Optimization', () => {
    it('provides minimum touch targets for scan optimization', () => {
      render(
        <HierarchyContainer priority="primary" scanOptimized={true}>
          <text>Touch Target</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Touch Target').parent;
      expect(container).toHaveStyle({
        minHeight: 44, // WCAG minimum touch target
      });
    });

    it('supports outdoor visibility requirements', () => {
      render(
        <HierarchyContainer priority="primary">
          <text>Outdoor Visible</text>
        </HierarchyContainer>
      );
      
      // Primary content should have high contrast and visibility
      const container = screen.getByText('Outdoor Visible').parent;
      expect(container).toHaveStyle({
        shadowOpacity: 0.15, // Shadow for depth and visibility
        elevation: 6, // Android elevation for visibility
      });
    });
  });

  describe('Information Density Management', () => {
    it('balances primary information prominence with screen space', () => {
      render(
        <HierarchyContainer priority="primary" visualWeight="hero">
          <text>Dense Hero</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Dense Hero').parent;
      expect(container).toHaveStyle({
        padding: expect.any(Number), // Should provide adequate spacing
        minHeight: expect.any(Number), // Should ensure visibility without overwhelming
      });
    });

    it('compacts tertiary information to minimize screen usage', () => {
      render(
        <HierarchyContainer priority="tertiary" visualWeight="minimal">
          <text>Compact Tertiary</text>
        </HierarchyContainer>
      );
      
      const container = screen.getByText('Compact Tertiary').parent;
      expect(container).toHaveStyle({
        shadowOpacity: 0, // No shadow for minimal weight
        elevation: 0, // No elevation for minimal weight
      });
    });
  });
});