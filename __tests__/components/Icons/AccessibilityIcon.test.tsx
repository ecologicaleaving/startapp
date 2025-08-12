/**
 * AccessibilityIcon Component Tests
 * Story 1.5: Outdoor-Optimized Iconography
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibilityIcon } from '../../../components/Icons/AccessibilityIcon';

describe('AccessibilityIcon Component', () => {
  it('should render with basic props', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="navigation"
        name="home"
      />
    );
    
    const icon = getByRole('image');
    expect(icon).toBeTruthy();
  });

  it('should use button role for interactive icons', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <AccessibilityIcon
        category="navigation"
        name="home"
        isInteractive={true}
        onPress={mockOnPress}
      />
    );
    
    const button = getByRole('button');
    expect(button).toBeTruthy();
  });

  it('should generate enhanced accessibility labels', () => {
    const { getByLabelText } = render(
      <AccessibilityIcon
        category="navigation"
        name="home"
        screenReaderDescription="Navigate to home screen"
      />
    );
    
    const icon = getByLabelText(/navigation home icon.*Navigate to home screen/);
    expect(icon).toBeTruthy();
  });

  it('should provide contextual hints for interactive icons', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <AccessibilityIcon
        category="action"
        name="edit"
        isInteractive={true}
        onPress={mockOnPress}
        contextualHint="Edit tournament details"
      />
    );
    
    const button = getByRole('button');
    expect(button.props.accessibilityHint).toBe('Edit tournament details');
  });

  it('should use high contrast theme when specified', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="navigation"
        name="home"
        respectHighContrastMode={true}
        highContrastFallback="accessibility"
      />
    );
    
    const icon = getByRole('image');
    expect(icon).toBeTruthy();
  });

  it('should support accessibility state properties', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="action"
        name="toggle"
        isInteractive={true}
        onPress={() => {}}
        accessibilityState={{ checked: true }}
      />
    );
    
    const button = getByRole('button');
    expect(button.props.accessibilityState.checked).toBe(true);
  });

  it('should support accessibility value properties', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="action"
        name="volume"
        accessibilityValue={{ min: 0, max: 100, now: 50 }}
      />
    );
    
    const icon = getByRole('image');
    expect(icon.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 50,
    });
  });

  it('should support live region announcements', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="status"
        name="current"
        accessibilityLiveRegion="assertive"
      />
    );
    
    const icon = getByRole('image');
    expect(icon.props.accessibilityLiveRegion).toBe('assertive');
  });

  it('should handle importantForAccessibility prop', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="utility"
        name="info"
        importantForAccessibility="yes"
      />
    );
    
    const icon = getByRole('image');
    expect(icon.props.importantForAccessibility).toBe('yes');
  });

  it('should fallback gracefully without optional props', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="navigation"
        name="home"
      />
    );
    
    const icon = getByRole('image');
    expect(icon.props.accessibilityLabel).toContain('navigation home icon');
  });

  it('should support custom accessibility labels and hints', () => {
    const { getByRole } = render(
      <AccessibilityIcon
        category="navigation"
        name="home"
        accessibilityLabel="Custom home icon"
        accessibilityHint="Custom hint for home"
      />
    );
    
    const icon = getByRole('image');
    expect(icon.props.accessibilityLabel).toBe('Custom home icon');
    expect(icon.props.accessibilityHint).toBe('Custom hint for home');
  });
});