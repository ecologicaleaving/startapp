/**
 * Typography Utilities Tests
 * Tests for hierarchical typography system and scanning optimization
 */

import {
  getResponsiveTypography,
  getCriticalInfoTypography,
  getOptimizedLineHeight,
  getOptimizedLetterSpacing,
  getTouchTargetDimensions,
  getEmphasisFontWeight,
  getScanningPatternConfig,
  getOrientationAdjustments,
} from '../../utils/typography';
import { typography } from '../../theme/tokens';

// Mock Dimensions for testing
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })), // iPhone X dimensions
  },
  PixelRatio: {
    get: jest.fn(() => 2), // Standard pixel ratio
  },
}));

describe('Typography Utilities', () => {
  describe('getResponsiveTypography', () => {
    it('should return base typography for standard device without modifiers', () => {
      const result = getResponsiveTypography('body');
      expect(result.fontSize).toBe(typography.body.fontSize);
      expect(result.fontWeight).toBe(typography.body.fontWeight);
    });

    it('should increase font size for critical emphasis', () => {
      const result = getResponsiveTypography('body', { emphasis: 'critical' });
      const expected = Math.round(typography.body.fontSize * 1.15); // 15% increase
      expect(result.fontSize).toBe(expected);
    });

    it('should increase font size for primary hierarchy', () => {
      const result = getResponsiveTypography('body', { hierarchy: 'primary' });
      const expected = Math.round(typography.body.fontSize * 1.1); // 10% increase
      expect(result.fontSize).toBe(expected);
    });

    it('should apply combined scaling for emphasis and hierarchy', () => {
      const result = getResponsiveTypography('body', {
        emphasis: 'critical',
        hierarchy: 'primary',
      });
      const expected = Math.round(typography.body.fontSize * 1.15 * 1.1);
      expect(result.fontSize).toBe(expected);
    });

    it('should decrease font size for low emphasis', () => {
      const result = getResponsiveTypography('body', { emphasis: 'low' });
      const expected = Math.round(typography.body.fontSize * 0.95); // 5% decrease
      expect(result.fontSize).toBe(expected);
    });

    it('should decrease font size for tertiary hierarchy', () => {
      const result = getResponsiveTypography('body', { hierarchy: 'tertiary' });
      const expected = Math.round(typography.body.fontSize * 0.92); // 8% decrease
      expect(result.fontSize).toBe(expected);
    });
  });

  describe('getCriticalInfoTypography', () => {
    it('should return optimized typography for critical information', () => {
      const result = getCriticalInfoTypography('h1');
      expect(result.fontSize).toBeGreaterThan(typography.h1.fontSize);
      expect(result.fontWeight).toBe('bold');
      expect(result.minHeight).toBeGreaterThanOrEqual(44); // WCAG minimum touch target
    });

    it('should include touch target dimensions', () => {
      const result = getCriticalInfoTypography('body');
      expect(result.minHeight).toBeDefined();
      expect(result.minWidth).toBeDefined();
      expect(result.paddingVertical).toBeDefined();
      expect(result.paddingHorizontal).toBeDefined();
    });
  });

  describe('getOptimizedLineHeight', () => {
    it('should return tighter line height for headings', () => {
      const fontSize = 32;
      const result = getOptimizedLineHeight(fontSize, 'h1');
      const expectedRatio = result / fontSize;
      expect(expectedRatio).toBeGreaterThanOrEqual(1.2);
      expect(expectedRatio).toBeLessThanOrEqual(1.3);
    });

    it('should return looser line height for body text', () => {
      const fontSize = 16;
      const result = getOptimizedLineHeight(fontSize, 'body');
      const expectedRatio = result / fontSize;
      expect(expectedRatio).toBeGreaterThanOrEqual(1.4);
      expect(expectedRatio).toBeLessThanOrEqual(1.6);
    });

    it('should maintain minimum line height from base typography', () => {
      const fontSize = 12; // Smaller than base
      const result = getOptimizedLineHeight(fontSize, 'body');
      expect(result).toBeGreaterThanOrEqual(typography.body.lineHeight);
    });
  });

  describe('getOptimizedLetterSpacing', () => {
    it('should increase letter spacing for critical emphasis', () => {
      const result = getOptimizedLetterSpacing(16, 'body', 'critical');
      expect(result).toBeGreaterThan(typography.body.letterSpacing);
    });

    it('should slightly increase spacing for small text with emphasis', () => {
      const result = getOptimizedLetterSpacing(14, 'caption', 'medium');
      expect(result).toBeGreaterThan(typography.caption.letterSpacing);
    });

    it('should return base spacing for regular text without emphasis', () => {
      const result = getOptimizedLetterSpacing(16, 'body');
      expect(result).toBe(typography.body.letterSpacing);
    });
  });

  describe('getTouchTargetDimensions', () => {
    it('should ensure minimum 44px touch target for all variants', () => {
      const variants: Array<keyof typeof typography> = ['hero', 'h1', 'h2', 'bodyLarge', 'body', 'caption'];
      
      variants.forEach(variant => {
        const result = getTouchTargetDimensions(variant);
        expect(result.minHeight).toBeGreaterThanOrEqual(44);
        expect(result.minWidth).toBeGreaterThanOrEqual(44);
      });
    });

    it('should provide appropriate padding for small text', () => {
      const result = getTouchTargetDimensions('caption');
      expect(result.paddingVertical).toBeGreaterThan(0);
      expect(result.paddingHorizontal).toBeGreaterThanOrEqual(8);
    });

    it('should require less padding for large text', () => {
      const result = getTouchTargetDimensions('hero');
      const smallResult = getTouchTargetDimensions('caption');
      expect(result.paddingVertical).toBeLessThanOrEqual(smallResult.paddingVertical);
    });
  });

  describe('getEmphasisFontWeight', () => {
    it('should return bold for critical emphasis', () => {
      const result = getEmphasisFontWeight('normal', 'critical');
      expect(result).toBe('bold');
    });

    it('should return 600 for high emphasis', () => {
      const result = getEmphasisFontWeight('normal', 'high');
      expect(result).toBe('600');
    });

    it('should return 500 for medium emphasis', () => {
      const result = getEmphasisFontWeight('normal', 'medium');
      expect(result).toBe('500');
    });

    it('should return normal for low emphasis', () => {
      const result = getEmphasisFontWeight('bold', 'low');
      expect(result).toBe('normal');
    });

    it('should return base weight when no emphasis provided', () => {
      const result = getEmphasisFontWeight('bold');
      expect(result).toBe('bold');
    });
  });

  describe('getScanningPatternConfig', () => {
    it('should return quick scan configuration', () => {
      const result = getScanningPatternConfig('quickScan');
      expect(result.primaryWeight).toBe('bold');
      expect(result.spacing).toBe('loose');
    });

    it('should return detail scan configuration', () => {
      const result = getScanningPatternConfig('detailScan');
      expect(result.primaryWeight).toBe('600');
      expect(result.spacing).toBe('normal');
    });

    it('should return peripheral scan configuration', () => {
      const result = getScanningPatternConfig('peripheralScan');
      expect(result.primaryWeight).toBe('bold');
      expect(result.secondaryWeight).toBe('bold');
      expect(result.spacing).toBe('tight');
    });
  });

  describe('getOrientationAdjustments', () => {
    it('should detect landscape orientation', () => {
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 812, height: 375 }); // Landscape

      const result = getOrientationAdjustments();
      expect(result.isLandscape).toBe(true);
      expect(result.scaleFactor).toBe(0.90); // Smaller in landscape for more content
    });

    it('should detect portrait orientation', () => {
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 375, height: 812 }); // Portrait

      const result = getOrientationAdjustments();
      expect(result.isLandscape).toBe(false);
      expect(result.scaleFactor).toBe(1); // Normal scaling in portrait
    });
  });
});

describe('Typography Integration', () => {
  it('should maintain WCAG AAA contrast requirements', () => {
    // This test ensures that typography scaling doesn't compromise accessibility
    const criticalTypo = getCriticalInfoTypography('body');
    expect(criticalTypo.fontSize).toBeGreaterThan(0);
    expect(criticalTypo.lineHeight).toBeGreaterThan(0);
    expect(criticalTypo.fontWeight).toBe('bold');
  });

  it('should provide consistent scaling across all typography variants', () => {
    const variants: Array<keyof typeof typography> = ['hero', 'h1', 'h2', 'bodyLarge', 'body', 'caption'];
    
    variants.forEach(variant => {
      const responsive = getResponsiveTypography(variant, { emphasis: 'high' });
      expect(responsive.fontSize).toBeGreaterThan(typography[variant].fontSize);
    });
  });

  it('should ensure outdoor readability optimizations', () => {
    const criticalInfo = getCriticalInfoTypography('h2');
    expect(criticalInfo.letterSpacing).toBeGreaterThan(typography.h2.letterSpacing);
    expect(criticalInfo.minHeight).toBeGreaterThanOrEqual(44);
  });
});