import { formatTime, formatDate, formatDateLong } from '../dateFormatters';

describe('dateFormatters', () => {
  const testDate = new Date('2025-08-08T14:30:00.000Z');

  describe('formatTime', () => {
    it('should return provided time string when available', () => {
      const result = formatTime(testDate, '15:30');
      expect(result).toBe('15:30');
    });

    it('should format time from date when time string is not provided', () => {
      const result = formatTime(testDate);
      // Note: This will depend on timezone, but format should be HH:MM
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format time from date when time string is empty', () => {
      const result = formatTime(testDate, '');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatDate', () => {
    it('should format date in short format', () => {
      const result = formatDate(testDate);
      // Format: "Thu, Aug 8" (locale dependent)
      expect(result).toContain('Aug');
      expect(result).toContain('8');
    });

    it('should handle different dates correctly', () => {
      const christmasDate = new Date('2025-12-25T12:00:00.000Z');
      const result = formatDate(christmasDate);
      expect(result).toContain('Dec');
      expect(result).toContain('25');
    });
  });

  describe('formatDateLong', () => {
    it('should format date in long format', () => {
      const result = formatDateLong(testDate);
      // Format: "Friday, August 8, 2025" (locale dependent)
      expect(result).toContain('August');
      expect(result).toContain('2025');
      expect(result).toContain('8');
    });

    it('should include weekday in long format', () => {
      const result = formatDateLong(testDate);
      // Should contain a weekday name
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const hasWeekday = weekdays.some(day => result.includes(day));
      expect(hasWeekday).toBeTruthy();
    });
  });

  describe('consistency between formats', () => {
    it('should handle same date across all formatters', () => {
      const time = formatTime(testDate, '');
      const shortDate = formatDate(testDate);
      const longDate = formatDateLong(testDate);

      // All should be non-empty strings
      expect(time.length).toBeGreaterThan(0);
      expect(shortDate.length).toBeGreaterThan(0);
      expect(longDate.length).toBeGreaterThan(0);

      // Long date should contain more information
      expect(longDate.length).toBeGreaterThan(shortDate.length);
    });
  });
});