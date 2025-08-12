/**
 * Scanning Patterns Tests
 * Tests for Task 3: Quick-scan typography patterns and emphasis systems
 */

import {
  getScannableTypography,
  urgencyEmphasis,
  applyUrgencyEmphasis,
  peripheralPatterns,
  getPeripheralStyle,
  scanningMetrics,
  validateScanningPattern,
  type ScanningContext,
  type UrgencyLevel,
} from '../../utils/scanningPatterns';

import {
  applyInformationEmphasis,
  applyComparativeEmphasis,
  applyPriorityHierarchy,
  getContextualEmphasis,
  categoryEmphasis,
  type InformationCategory,
} from '../../utils/textEmphasis';

import { getOrientationResponsiveTypography } from '../../utils/typography';

// Mock React Native Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })), // Portrait by default
  },
  PixelRatio: {
    get: jest.fn(() => 2),
  },
}));

describe('Scanning Patterns', () => {
  describe('getScannableTypography', () => {
    it('should return typography styles for quick assignment check context', () => {
      const style = getScannableTypography('quick-assignment-check', 'primary');
      
      expect(style.fontSize).toBe(28);
      expect(style.fontWeight).toBe('800');
      expect(style.lineHeight).toBe(36);
      expect(style.letterSpacing).toBe(0.5);
    });

    it('should return different styles for different scanning contexts', () => {
      const quickStyle = getScannableTypography('quick-assignment-check', 'primary');
      const detailStyle = getScannableTypography('detailed-match-review', 'primary');
      const peripheralStyle = getScannableTypography('peripheral-status-monitor', 'primary');
      
      // Quick scan should have largest, most prominent text
      expect(quickStyle.fontSize).toBeGreaterThan(detailStyle.fontSize);
      
      // Peripheral should have bold, tight spacing
      expect(peripheralStyle.fontWeight).toBe('bold');
      expect(peripheralStyle.letterSpacing).toBeGreaterThan(quickStyle.letterSpacing);
    });

    it('should support all scanning context types', () => {
      const contexts: ScanningContext[] = [
        'quick-assignment-check',
        'detailed-match-review', 
        'peripheral-status-monitor',
        'critical-alert-response',
        'schedule-overview',
        'result-verification',
      ];
      
      contexts.forEach(context => {
        const style = getScannableTypography(context, 'primary');
        expect(style).toBeDefined();
        expect(style.fontSize).toBeGreaterThan(0);
        expect(style.lineHeight).toBeGreaterThan(0);
      });
    });

    it('should provide appropriate styles for critical alerts', () => {
      const criticalStyle = getScannableTypography('critical-alert-response', 'primary');
      
      expect(criticalStyle.fontSize).toBe(36); // Large for immediate attention
      expect(criticalStyle.fontWeight).toBe('900'); // Maximum weight
      expect(criticalStyle.letterSpacing).toBe(1.0); // Wide spacing for clarity
      expect(criticalStyle.textShadowRadius).toBe(2); // Shadow for emphasis
    });
  });

  describe('urgencyEmphasis', () => {
    it('should define correct scaling for each urgency level', () => {
      expect(urgencyEmphasis.immediate.scale).toBe(1.4);
      expect(urgencyEmphasis.urgent.scale).toBe(1.2);
      expect(urgencyEmphasis.important.scale).toBe(1.1);
      expect(urgencyEmphasis.routine.scale).toBe(1.0);
    });

    it('should use appropriate font weights for urgency', () => {
      expect(urgencyEmphasis.immediate.weight).toBe('900');
      expect(urgencyEmphasis.urgent.weight).toBe('800');
      expect(urgencyEmphasis.important.weight).toBe('600');
      expect(urgencyEmphasis.routine.weight).toBe('normal');
    });

    it('should include shadow for immediate urgency only', () => {
      expect(urgencyEmphasis.immediate.shadow).toBe(true);
      expect(urgencyEmphasis.urgent.shadow).toBe(false);
      expect(urgencyEmphasis.important.shadow).toBe(false);
      expect(urgencyEmphasis.routine.shadow).toBe(false);
    });
  });

  describe('applyUrgencyEmphasis', () => {
    const baseStyle = {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
      letterSpacing: 0,
    };

    it('should scale font size based on urgency', () => {
      const immediateStyle = applyUrgencyEmphasis(baseStyle, 'immediate');
      const urgentStyle = applyUrgencyEmphasis(baseStyle, 'urgent');
      const routineStyle = applyUrgencyEmphasis(baseStyle, 'routine');
      
      expect(immediateStyle.fontSize).toBe(Math.round(16 * 1.4)); // 22
      expect(urgentStyle.fontSize).toBe(Math.round(16 * 1.2)); // 19
      expect(routineStyle.fontSize).toBe(16); // unchanged
    });

    it('should apply shadow for immediate urgency', () => {
      const immediateStyle = applyUrgencyEmphasis(baseStyle, 'immediate');
      
      expect(immediateStyle.textShadowColor).toBe('rgba(0,0,0,0.3)');
      expect(immediateStyle.textShadowOffset).toEqual({ width: 0, height: 1 });
      expect(immediateStyle.textShadowRadius).toBe(2);
    });

    it('should not apply shadow for lower urgency levels', () => {
      const urgentStyle = applyUrgencyEmphasis(baseStyle, 'urgent');
      
      expect(urgentStyle.textShadowColor).toBeUndefined();
      expect(urgentStyle.textShadowOffset).toBeUndefined();
      expect(urgentStyle.textShadowRadius).toBeUndefined();
    });
  });

  describe('peripheralPatterns', () => {
    it('should provide status badge pattern', () => {
      const pattern = peripheralPatterns.statusBadge;
      
      expect(pattern.fontSize).toBe(18);
      expect(pattern.fontWeight).toBe('800');
      expect(pattern.textTransform).toBe('uppercase');
      expect(pattern.minWidth).toBe(80);
    });

    it('should provide alert banner pattern', () => {
      const pattern = peripheralPatterns.alertBanner;
      
      expect(pattern.fontSize).toBe(22);
      expect(pattern.fontWeight).toBe('900');
      expect(pattern.letterSpacing).toBe(2.0);
      expect(pattern.textAlign).toBe('center');
    });
  });

  describe('validateScanningPattern', () => {
    it('should validate quick scanning patterns', () => {
      const result = validateScanningPattern('quick-assignment-check', 3, 18);
      
      expect(result.isOptimal).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about too many elements for quick scan', () => {
      const result = validateScanningPattern('quick-assignment-check', 8, 16);
      
      expect(result.isOptimal).toBe(false);
      expect(result.warnings[0]).toContain('Too many elements');
      expect(result.recommendations[0]).toContain('Reduce to');
    });

    it('should warn about font size too small', () => {
      const result = validateScanningPattern('peripheral-status-monitor', 2, 12);
      
      expect(result.isOptimal).toBe(false);
      expect(result.warnings[0]).toContain('Font size');
      expect(result.recommendations[0]).toContain('Increase to minimum');
    });

    it('should provide context-appropriate metrics', () => {
      const peripheralResult = validateScanningPattern('peripheral-status-monitor', 2, 20);
      const detailResult = validateScanningPattern('detailed-match-review', 8, 14);
      
      // Different contexts should have different validation criteria
      expect(peripheralResult.isOptimal).toBe(true); // 2 elements, 20px is good for peripheral
      expect(detailResult.isOptimal).toBe(true); // 8 elements, 14px is acceptable for detailed
    });
  });
});

describe('Text Emphasis Systems', () => {
  describe('applyInformationEmphasis', () => {
    const baseStyle = {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
      letterSpacing: 0,
    };

    it('should apply maximum emphasis for match-critical information', () => {
      const emphasizedStyle = applyInformationEmphasis(baseStyle, 'match-critical');
      
      expect(emphasizedStyle.fontSize).toBeGreaterThan(baseStyle.fontSize);
      expect(emphasizedStyle.fontWeight).toBe('900');
    });

    it('should apply appropriate emphasis for different categories', () => {
      const matchCritical = applyInformationEmphasis(baseStyle, 'match-critical');
      const administrative = applyInformationEmphasis(baseStyle, 'administrative');
      
      // Match-critical should have more emphasis than administrative
      expect(matchCritical.fontSize).toBeGreaterThan(administrative.fontSize || baseStyle.fontSize);
    });

    it('should support all information categories', () => {
      const categories: InformationCategory[] = [
        'match-critical',
        'assignment-status',
        'time-sensitive',
        'location-change',
        'equipment-alert',
        'administrative',
        'personal-note',
      ];
      
      categories.forEach(category => {
        const style = applyInformationEmphasis(baseStyle, category);
        expect(style).toBeDefined();
        expect(style.color).toBeDefined();
      });
    });
  });

  describe('applyComparativeEmphasis', () => {
    const baseStyle = {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
      letterSpacing: 0,
    };

    it('should emphasize urgent information more than routine', () => {
      const urgentStyle = applyComparativeEmphasis(baseStyle, true);
      const routineStyle = applyComparativeEmphasis(baseStyle, false);
      
      expect(urgentStyle.fontSize).toBeGreaterThan(routineStyle.fontSize);
      expect(urgentStyle.backgroundColor).not.toBe('transparent');
      expect(routineStyle.backgroundColor).toBe('transparent');
    });

    it('should apply border and background to urgent information', () => {
      const urgentStyle = applyComparativeEmphasis(baseStyle, true);
      
      expect(urgentStyle.borderWidth).toBe(1);
      expect(urgentStyle.paddingHorizontal).toBe(8);
      expect(urgentStyle.paddingVertical).toBe(4);
    });

    it('should not apply visual chrome to routine information', () => {
      const routineStyle = applyComparativeEmphasis(baseStyle, false);
      
      expect(routineStyle.borderWidth).toBe(0);
      expect(routineStyle.paddingHorizontal).toBe(0);
      expect(routineStyle.paddingVertical).toBe(0);
    });
  });

  describe('applyPriorityHierarchy', () => {
    const baseStyle = {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
      letterSpacing: 0,
    };

    it('should apply stronger emphasis for higher priority', () => {
      const priority1 = applyPriorityHierarchy(baseStyle, 1);
      const priority4 = applyPriorityHierarchy(baseStyle, 4);
      
      expect(priority1.fontSize).toBeGreaterThan(priority4.fontSize);
      expect(priority1.borderLeftWidth).toBeGreaterThan(priority4.borderLeftWidth);
    });

    it('should use appropriate colors for each priority level', () => {
      const priority1 = applyPriorityHierarchy(baseStyle, 1);
      const priority2 = applyPriorityHierarchy(baseStyle, 2);
      const priority3 = applyPriorityHierarchy(baseStyle, 3);
      const priority4 = applyPriorityHierarchy(baseStyle, 4);
      
      // Each priority should have distinct styling
      expect(priority1.backgroundColor).toBe('#FFEBEE'); // Error color background
      expect(priority2.backgroundColor).toBe('#FFF8E1'); // Warning color background
      expect(priority3.backgroundColor).toBe('#FFF3E0'); // Accent color background
      expect(priority4.backgroundColor).toBe('transparent'); // No background for lowest priority
    });
  });

  describe('getContextualEmphasis', () => {
    it('should adjust intensity based on urgency and priority', () => {
      const highUrgencyEmphasis = getContextualEmphasis('match-critical', 'immediate', 1);
      const lowUrgencyEmphasis = getContextualEmphasis('administrative', 'routine', 4);
      
      expect(highUrgencyEmphasis.intensity).toBe('maximum');
      expect(lowUrgencyEmphasis.intensity).toBe('subtle');
    });

    it('should return appropriate technique for each category', () => {
      const matchCriticalEmphasis = getContextualEmphasis('match-critical', 'urgent', 2);
      
      expect(matchCriticalEmphasis.category).toBe('match-critical');
      expect(matchCriticalEmphasis.technique).toBe('size-scale'); // Match-critical uses size scaling
    });
  });
});

describe('Orientation Responsive Typography', () => {
  describe('getOrientationResponsiveTypography', () => {
    beforeEach(() => {
      // Reset to portrait mode
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 375, height: 812 });
    });

    it('should return base typography in portrait mode', () => {
      const typography = getOrientationResponsiveTypography('body');
      
      expect(typography.fontSize).toBeGreaterThan(0);
      expect(typography.lineHeight).toBeGreaterThan(0);
      expect(typography.marginVertical).toBeDefined();
    });

    it('should scale down typography in landscape mode', () => {
      // Switch to landscape
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 812, height: 375 });

      const landscapeTypography = getOrientationResponsiveTypography('body');
      
      // Should be scaled down for landscape
      expect(landscapeTypography.fontSize).toBeLessThanOrEqual(16); // Base body is 16px
      expect(landscapeTypography.marginVertical).toBeLessThan(4); // Tighter margins
    });

    it('should maintain hierarchy in landscape mode', () => {
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 812, height: 375 });

      const heroTypography = getOrientationResponsiveTypography('hero', { 
        emphasis: 'critical',
        maintainHierarchy: true 
      });
      const bodyTypography = getOrientationResponsiveTypography('body');
      
      // Hero should still be significantly larger than body even in landscape
      expect(heroTypography.fontSize).toBeGreaterThan(bodyTypography.fontSize * 1.5);
    });

    it('should adjust line height and spacing for orientation', () => {
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 812, height: 375 });

      const landscapeTypography = getOrientationResponsiveTypography('h1');
      
      expect(landscapeTypography.lineHeight).toBeGreaterThanOrEqual(landscapeTypography.fontSize * 1.2);
      expect(landscapeTypography.marginVertical).toBeGreaterThan(0);
    });
  });
});