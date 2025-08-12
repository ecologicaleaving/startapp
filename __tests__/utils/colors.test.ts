/**
 * Color Utilities Tests
 * Validates color utility functions and status-driven color system
 */

import {
  getColor,
  getTextColor, 
  statusColors,
  getStatusColor,
  getStatusTextColor,
  validateColorCombination,
  colorPalette,
  createColorStyle,
  getHighContrastColor,
  colorContrastDocs,
} from '../../utils/colors';
import { colors } from '../../theme/tokens';

describe('Color Utilities', () => {
  describe('getColor', () => {
    it('should return correct color values for all color names', () => {
      expect(getColor('primary')).toBe('#1B365D');
      expect(getColor('accent')).toBe('#B8391A'); // Updated FIVB color
      expect(getColor('textPrimary')).toBe('#2C3E50');
      expect(getColor('background')).toBe('#FFFFFF');
    });

    it('should handle all color names from token system', () => {
      Object.keys(colors).forEach(colorName => {
        const color = getColor(colorName as keyof typeof colors);
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(color).toBe(colors[colorName as keyof typeof colors]);
      });
    });
  });

  describe('getTextColor', () => {
    it('should return appropriate text colors for backgrounds', () => {
      expect(getTextColor('background')).toBe(colors.textPrimary);
      expect(getTextColor('primary')).toBe(colors.background);
      expect(getTextColor('secondary')).toBe(colors.background);
    });

    it('should return valid hex colors', () => {
      const backgrounds: (keyof typeof colors)[] = ['background', 'primary', 'secondary', 'accent'];
      
      backgrounds.forEach(bg => {
        const textColor = getTextColor(bg);
        expect(textColor).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('statusColors', () => {
    it('should have all required status types', () => {
      const expectedStatuses = ['active', 'upcoming', 'completed', 'cancelled', 'primary', 'accent'];
      
      expectedStatuses.forEach(status => {
        expect(statusColors).toHaveProperty(status);
        expect(statusColors[status as keyof typeof statusColors]).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should map to semantically correct colors', () => {
      expect(statusColors.active).toBe(colors.success);      // Green for active/live
      expect(statusColors.upcoming).toBe(colors.warning);    // Orange for upcoming
      expect(statusColors.cancelled).toBe(colors.error);     // Red for cancelled
      expect(statusColors.primary).toBe(colors.primary);     // Primary brand color
      expect(statusColors.accent).toBe(colors.accent);       // Accent color
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for all status types', () => {
      expect(getStatusColor('active')).toBe(colors.success);
      expect(getStatusColor('upcoming')).toBe(colors.warning);
      expect(getStatusColor('completed')).toBe(colors.textSecondary);
      expect(getStatusColor('cancelled')).toBe(colors.error);
      expect(getStatusColor('primary')).toBe(colors.primary);
      expect(getStatusColor('accent')).toBe(colors.accent);
    });
  });

  describe('getStatusTextColor', () => {
    it('should return contrasting text colors for status backgrounds', () => {
      const statuses: (keyof typeof statusColors)[] = ['active', 'upcoming', 'cancelled', 'primary'];
      
      statuses.forEach(status => {
        const textColor = getStatusTextColor(status);
        expect(textColor).toMatch(/^#[0-9A-F]{6}$/i);
        expect(['#FFFFFF', '#000000']).toContain(textColor); // Should be black or white for best contrast
      });
    });
  });

  describe('validateColorCombination', () => {
    it('should validate WCAG AAA compliant combinations', () => {
      const result = validateColorCombination(colors.textPrimary, colors.background);
      expect(result.isValid).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(7);
      expect(result.recommendation).toBeUndefined();
    });

    it('should identify non-compliant combinations', () => {
      // Light gray on white background (poor contrast)
      const result = validateColorCombination('#CCCCCC', '#FFFFFF');
      expect(result.isValid).toBe(false);
      expect(result.ratio).toBeLessThan(7);
      expect(result.recommendation).toBeDefined();
    });

    it('should provide appropriate recommendations', () => {
      // Medium contrast (AA but not AAA)
      const result = validateColorCombination('#666666', '#FFFFFF');
      expect(result.isValid).toBe(false);
      expect(result.recommendation).toContain('WCAG AA');
    });
  });

  describe('colorPalette', () => {
    it('should include all base colors', () => {
      Object.keys(colors).forEach(colorName => {
        expect(colorPalette).toHaveProperty(colorName);
        expect(colorPalette[colorName as keyof typeof colorPalette]).toBe(colors[colorName as keyof typeof colors]);
      });
    });

    it('should include semantic aliases', () => {
      expect(colorPalette.success).toBe(colors.success);
      expect(colorPalette.info).toBe(colors.secondary);
      expect(colorPalette.warning).toBe(colors.warning);
      expect(colorPalette.danger).toBe(colors.error);
      expect(colorPalette.light).toBe(colors.background);
      expect(colorPalette.dark).toBe(colors.primary);
      expect(colorPalette.muted).toBe(colors.textSecondary);
    });
  });

  describe('createColorStyle', () => {
    it('should create color style objects', () => {
      const colorStyle = createColorStyle('primary', 'color');
      expect(colorStyle).toEqual({ color: colors.primary });
    });

    it('should create background color style objects', () => {
      const bgStyle = createColorStyle('accent', 'backgroundColor');
      expect(bgStyle).toEqual({ backgroundColor: colors.accent });
    });

    it('should default to color property', () => {
      const defaultStyle = createColorStyle('success');
      expect(defaultStyle).toEqual({ color: colors.success });
    });
  });

  describe('getHighContrastColor', () => {
    it('should return normal colors when high contrast is disabled', () => {
      expect(getHighContrastColor('textSecondary', false)).toBe(colors.textSecondary);
      expect(getHighContrastColor('secondary', false)).toBe(colors.secondary);
      expect(getHighContrastColor('primary', false)).toBe(colors.primary);
    });

    it('should return adjusted colors in high contrast mode', () => {
      expect(getHighContrastColor('textSecondary', true)).toBe(colors.textPrimary);
      expect(getHighContrastColor('secondary', true)).toBe(colors.primary);
    });

    it('should return original color for unadjusted colors in high contrast', () => {
      expect(getHighContrastColor('accent', true)).toBe(colors.accent);
      expect(getHighContrastColor('error', true)).toBe(colors.error);
    });
  });

  describe('colorContrastDocs', () => {
    it('should document all critical color combinations', () => {
      expect(colorContrastDocs).toHaveProperty('textPrimary on background');
      expect(colorContrastDocs).toHaveProperty('textSecondary on background');
      expect(colorContrastDocs).toHaveProperty('accent on background');
      expect(colorContrastDocs).toHaveProperty('background on primary');
    });

    it('should indicate WCAG compliance levels', () => {
      Object.values(colorContrastDocs).forEach(doc => {
        expect(doc).toMatch(/WCAG (AAA|AA\+)/); // Should indicate WCAG level
        expect(doc).toMatch(/\d+\.\d+:1/); // Should contain ratio like "7.58:1"
      });
    });
  });

  describe('WCAG AAA Compliance Validation', () => {
    it('should validate all status colors meet contrast requirements', () => {
      Object.entries(statusColors).forEach(([status, color]) => {
        const result = validateColorCombination(color, colors.background);
        expect(result.ratio).toBeGreaterThan(4.5); // At least WCAG AA
      });
    });

    it('should validate text colors on standard backgrounds', () => {
      const textOnBg = validateColorCombination(colors.textPrimary, colors.background);
      const textOnPrimary = validateColorCombination(colors.background, colors.primary);
      
      expect(textOnBg.isValid).toBe(true);
      expect(textOnPrimary.isValid).toBe(true);
    });
  });
});