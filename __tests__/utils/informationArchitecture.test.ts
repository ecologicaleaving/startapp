/**
 * Information Architecture Tests (Non-JSX)
 * Testing the classifier and hierarchy specifications
 */

import {
  InformationClassifier,
  type ClassifiableContentType,
  type InformationPriority,
} from '../../components/Hierarchy/InformationArchitecture';

describe('InformationArchitecture (Core Logic)', () => {
  describe('InformationClassifier', () => {
    it('classifies current assignment as primary', () => {
      const priority = InformationClassifier.classifyContent('currentAssignment' as ClassifiableContentType);
      expect(priority).toBe('primary');
    });

    it('classifies time critical data as primary', () => {
      const priority = InformationClassifier.classifyContent('timeCritical' as ClassifiableContentType);
      expect(priority).toBe('primary');
    });

    it('classifies referee responsibility as primary', () => {
      const priority = InformationClassifier.classifyContent('refereeResponsibility' as ClassifiableContentType);
      expect(priority).toBe('primary');
    });

    it('classifies countdown timer as primary', () => {
      const priority = InformationClassifier.classifyContent('countdownTimer' as ClassifiableContentType);
      expect(priority).toBe('primary');
    });

    it('classifies urgent notification as primary', () => {
      const priority = InformationClassifier.classifyContent('urgentNotification' as ClassifiableContentType);
      expect(priority).toBe('primary');
    });

    it('classifies tournament context as secondary', () => {
      const priority = InformationClassifier.classifyContent('tournamentContext' as ClassifiableContentType);
      expect(priority).toBe('secondary');
    });

    it('classifies match details as secondary', () => {
      const priority = InformationClassifier.classifyContent('matchDetails' as ClassifiableContentType);
      expect(priority).toBe('secondary');
    });

    it('classifies team information as secondary', () => {
      const priority = InformationClassifier.classifyContent('teamInformation' as ClassifiableContentType);
      expect(priority).toBe('secondary');
    });

    it('classifies schedule context as secondary', () => {
      const priority = InformationClassifier.classifyContent('scheduleContext' as ClassifiableContentType);
      expect(priority).toBe('secondary');
    });

    it('classifies assignment preview as secondary', () => {
      const priority = InformationClassifier.classifyContent('assignmentPreview' as ClassifiableContentType);
      expect(priority).toBe('secondary');
    });

    it('classifies general tournament as tertiary', () => {
      const priority = InformationClassifier.classifyContent('generalTournament' as ClassifiableContentType);
      expect(priority).toBe('tertiary');
    });

    it('classifies statistics as tertiary', () => {
      const priority = InformationClassifier.classifyContent('statistics' as ClassifiableContentType);
      expect(priority).toBe('tertiary');
    });

    it('classifies administrative details as tertiary', () => {
      const priority = InformationClassifier.classifyContent('administrativeDetails' as ClassifiableContentType);
      expect(priority).toBe('tertiary');
    });

    it('classifies historical data as tertiary', () => {
      const priority = InformationClassifier.classifyContent('historicalData' as ClassifiableContentType);
      expect(priority).toBe('tertiary');
    });

    it('classifies system information as tertiary', () => {
      const priority = InformationClassifier.classifyContent('systemInformation' as ClassifiableContentType);
      expect(priority).toBe('tertiary');
    });
  });

  describe('Hierarchy Specifications', () => {
    it('returns correct primary hierarchy specifications', () => {
      const specs = InformationClassifier.getHierarchySpecs('primary');
      expect(specs.fontSize).toBe(20);
      expect(specs.fontWeight).toBe('bold');
      expect(specs.lineHeight).toBe(28);
      expect(typeof specs.marginBottom).toBe('number');
      expect(typeof specs.color).toBe('string');
    });

    it('returns correct secondary hierarchy specifications', () => {
      const specs = InformationClassifier.getHierarchySpecs('secondary');
      expect(specs.fontSize).toBe(16);
      expect(specs.fontWeight).toBe('600');
      expect(specs.lineHeight).toBe(22);
      expect(typeof specs.marginBottom).toBe('number');
      expect(typeof specs.color).toBe('string');
    });

    it('returns correct tertiary hierarchy specifications', () => {
      const specs = InformationClassifier.getHierarchySpecs('tertiary');
      expect(specs.fontSize).toBe(14);
      expect(specs.fontWeight).toBe('normal');
      expect(specs.lineHeight).toBe(20);
      expect(typeof specs.marginBottom).toBe('number');
      expect(typeof specs.color).toBe('string');
    });

    it('has different font sizes for each priority level', () => {
      const primarySpecs = InformationClassifier.getHierarchySpecs('primary');
      const secondarySpecs = InformationClassifier.getHierarchySpecs('secondary');
      const tertiarySpecs = InformationClassifier.getHierarchySpecs('tertiary');

      expect(primarySpecs.fontSize).toBeGreaterThan(secondarySpecs.fontSize);
      expect(secondarySpecs.fontSize).toBeGreaterThan(tertiarySpecs.fontSize);
    });

    it('has appropriate line heights for readability', () => {
      const primarySpecs = InformationClassifier.getHierarchySpecs('primary');
      const secondarySpecs = InformationClassifier.getHierarchySpecs('secondary');
      const tertiarySpecs = InformationClassifier.getHierarchySpecs('tertiary');

      // Line height should be proportional to font size for readability
      expect(primarySpecs.lineHeight / primarySpecs.fontSize).toBeCloseTo(1.4, 1);
      expect(secondarySpecs.lineHeight / secondarySpecs.fontSize).toBeCloseTo(1.375, 1);
      expect(tertiarySpecs.lineHeight / tertiarySpecs.fontSize).toBeCloseTo(1.43, 1);
    });
  });

  describe('Content Type Classification Logic', () => {
    it('classifies all primary content types correctly', () => {
      const primaryTypes: ClassifiableContentType[] = [
        'currentAssignment', 'timeCritical', 'refereeResponsibility', 
        'countdownTimer', 'urgentNotification'
      ];

      primaryTypes.forEach(contentType => {
        const priority = InformationClassifier.classifyContent(contentType);
        expect(priority).toBe('primary');
      });
    });

    it('classifies all secondary content types correctly', () => {
      const secondaryTypes: ClassifiableContentType[] = [
        'tournamentContext', 'matchDetails', 'teamInformation', 
        'scheduleContext', 'assignmentPreview'
      ];

      secondaryTypes.forEach(contentType => {
        const priority = InformationClassifier.classifyContent(contentType);
        expect(priority).toBe('secondary');
      });
    });

    it('classifies all tertiary content types correctly', () => {
      const tertiaryTypes: ClassifiableContentType[] = [
        'generalTournament', 'statistics', 'administrativeDetails', 
        'historicalData', 'systemInformation'
      ];

      tertiaryTypes.forEach(contentType => {
        const priority = InformationClassifier.classifyContent(contentType);
        expect(priority).toBe('tertiary');
      });
    });
  });

  describe('Referee-First Priority System', () => {
    it('prioritizes referee immediate needs over tournament context', () => {
      const assignmentPriority = InformationClassifier.classifyContent('currentAssignment');
      const tournamentPriority = InformationClassifier.classifyContent('tournamentContext');
      
      expect(assignmentPriority).toBe('primary');
      expect(tournamentPriority).toBe('secondary');
    });

    it('prioritizes time-critical information appropriately', () => {
      const timeCriticalPriority = InformationClassifier.classifyContent('timeCritical');
      const statisticsPriority = InformationClassifier.classifyContent('statistics');
      
      expect(timeCriticalPriority).toBe('primary');
      expect(statisticsPriority).toBe('tertiary');
    });

    it('ensures urgent notifications have highest priority', () => {
      const urgentPriority = InformationClassifier.classifyContent('urgentNotification');
      const adminPriority = InformationClassifier.classifyContent('administrativeDetails');
      
      expect(urgentPriority).toBe('primary');
      expect(adminPriority).toBe('tertiary');
    });
  });
});