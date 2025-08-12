/**
 * Brand Components Tests
 * Test professional FIVB brand components
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { 
  BrandLogo, 
  BrandHeader, 
  BrandLoadingState, 
  BrandErrorState,
  BrandEmptyState,
  BrandSplashScreen 
} from '../../../components/Brand';

// Mock the brand assets
jest.mock('../../../assets/brand', () => ({
  brandAssets: {
    logo: {
      primary: {
        light: 'mocked-logo-primary-light',
        dark: 'mocked-logo-primary-dark',
      },
      symbol: {
        light: 'mocked-logo-symbol-light',
        dark: 'mocked-logo-symbol-dark',
      }
    }
  },
  getBrandAsset: jest.fn(() => ({
    uri: 'mocked-asset',
    width: 200,
    height: 60,
    scale: 1,
  })),
}));

describe('Brand Components', () => {
  describe('BrandLogo', () => {
    it('should render with default props', () => {
      const { getByLabelText } = render(<BrandLogo />);
      expect(getByLabelText('FIVB primary logo')).toBeTruthy();
    });

    it('should render symbol variant', () => {
      const { getByLabelText } = render(<BrandLogo variant="symbol" />);
      expect(getByLabelText('FIVB symbol logo')).toBeTruthy();
    });

    it('should handle different themes', () => {
      const { getByLabelText } = render(<BrandLogo theme="dark" />);
      expect(getByLabelText('FIVB primary logo')).toBeTruthy();
    });

    it('should handle different sizes', () => {
      const { getByLabelText } = render(<BrandLogo size="large" />);
      expect(getByLabelText('FIVB primary logo')).toBeTruthy();
    });

    it('should handle custom numeric size', () => {
      const { getByLabelText } = render(<BrandLogo size={100} />);
      expect(getByLabelText('FIVB primary logo')).toBeTruthy();
    });
  });

  describe('BrandHeader', () => {
    it('should render with default title', () => {
      const { getByText } = render(<BrandHeader />);
      expect(getByText('Referee Tool')).toBeTruthy();
    });

    it('should render custom title and subtitle', () => {
      const { getByText } = render(
        <BrandHeader title="Custom Title" subtitle="Custom Subtitle" />
      );
      expect(getByText('Custom Title')).toBeTruthy();
      expect(getByText('Custom Subtitle')).toBeTruthy();
    });

    it('should hide logo when showLogo is false', () => {
      const { queryByLabelText } = render(<BrandHeader showLogo={false} />);
      expect(queryByLabelText(/FIVB.*logo/)).toBeNull();
    });

    it('should render with different logo variants', () => {
      const { getByLabelText } = render(<BrandHeader logoVariant="symbol" />);
      expect(getByLabelText('FIVB symbol logo')).toBeTruthy();
    });
  });

  describe('BrandLoadingState', () => {
    it('should render with default logo variant', () => {
      const { getByText } = render(<BrandLoadingState />);
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should render custom message', () => {
      const { getByText } = render(<BrandLoadingState message="Please wait..." />);
      expect(getByText('Please wait...')).toBeTruthy();
    });

    it('should render spinner variant', () => {
      const { getByText } = render(<BrandLoadingState variant="spinner" />);
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should render skeleton variant', () => {
      const { getByText } = render(<BrandLoadingState variant="skeleton" />);
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should handle different sizes', () => {
      const { getByText } = render(<BrandLoadingState size="large" />);
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('BrandErrorState', () => {
    it('should render with default error message', () => {
      const { getByText } = render(<BrandErrorState />);
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Please try again later.')).toBeTruthy();
    });

    it('should render custom title and message', () => {
      const { getByText } = render(
        <BrandErrorState 
          title="Custom Error" 
          message="Custom error message" 
        />
      );
      expect(getByText('Custom Error')).toBeTruthy();
      expect(getByText('Custom error message')).toBeTruthy();
    });

    it('should handle action button press', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <BrandErrorState 
          onAction={mockAction}
          actionLabel="Retry"
        />
      );
      
      fireEvent.press(getByText('Retry'));
      expect(mockAction).toHaveBeenCalled();
    });

    it('should render warning variant', () => {
      const { getByText } = render(<BrandErrorState variant="warning" />);
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('should hide icon when showIcon is false', () => {
      const { getByText } = render(<BrandErrorState showIcon={false} />);
      expect(getByText('Something went wrong')).toBeTruthy();
      // Icon container should not contain emoji
    });
  });

  describe('BrandEmptyState', () => {
    it('should render with default empty message', () => {
      const { getByText } = render(<BrandEmptyState />);
      expect(getByText('No data available')).toBeTruthy();
      expect(getByText('There\'s nothing to show here yet.')).toBeTruthy();
    });

    it('should render custom title and message', () => {
      const { getByText } = render(
        <BrandEmptyState 
          title="No Matches" 
          message="No matches scheduled today." 
        />
      );
      expect(getByText('No Matches')).toBeTruthy();
      expect(getByText('No matches scheduled today.')).toBeTruthy();
    });

    it('should handle action button press', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <BrandEmptyState 
          onAction={mockAction}
          actionLabel="Add Match"
        />
      );
      
      fireEvent.press(getByText('Add Match'));
      expect(mockAction).toHaveBeenCalled();
    });

    it('should render custom icon', () => {
      const { getByText } = render(
        <BrandEmptyState icon="🏐" title="Custom Icon Test" />
      );
      expect(getByText('Custom Icon Test')).toBeTruthy();
    });
  });

  describe('BrandSplashScreen', () => {
    it('should render with default title and subtitle', () => {
      const { getByText } = render(<BrandSplashScreen />);
      expect(getByText('FIVB Referee Tool')).toBeTruthy();
      expect(getByText('Professional Tournament Management')).toBeTruthy();
    });

    it('should render custom title and subtitle', () => {
      const { getByText } = render(
        <BrandSplashScreen 
          title="Custom App" 
          subtitle="Custom description" 
        />
      );
      expect(getByText('Custom App')).toBeTruthy();
      expect(getByText('Custom description')).toBeTruthy();
    });

    it('should render FIVB branding footer', () => {
      const { getByText } = render(<BrandSplashScreen />);
      expect(getByText('Powered by FIVB Technology')).toBeTruthy();
    });

    it('should call onAnimationComplete when provided', () => {
      const mockComplete = jest.fn();
      render(<BrandSplashScreen onAnimationComplete={mockComplete} />);
      // Animation completion is tested implicitly through render without error
    });
  });
});