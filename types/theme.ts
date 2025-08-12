/**
 * Design Token Type Definitions
 * Outdoor-Optimized Visual Design System
 */

export interface ColorToken {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  background: string;
}

export interface ColorContrast {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
}

export interface ContrastValidation {
  [key: string]: {
    onBackground: ColorContrast;
    onPrimary: ColorContrast;
    onSecondary: ColorContrast;
  };
}

export interface TypographyToken {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing?: number;
}

export interface TypographyScale {
  hero: TypographyToken;
  h1: TypographyToken;
  h2: TypographyToken;
  bodyLarge: TypographyToken;
  body: TypographyToken;
  caption: TypographyToken;
}

export interface SpacingToken {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

// Status-specific color mappings for tournament referees
export interface StatusColors {
  current: string;      // Current/Active assignments (High-visibility alert orange)
  upcoming: string;     // Upcoming assignments (Professional blue)
  completed: string;    // Completed assignments (Success green)
  cancelled: string;    // Cancelled/Changed assignments (Warning indicators)
  emergency: string;    // Emergency/Urgent states (Maximum visibility)
}

export interface DesignTokens {
  colors: ColorToken;
  statusColors: StatusColors;
  typography: TypographyScale;
  spacing: SpacingToken;
  contrast: ContrastValidation;
}

export interface ThemeContextType {
  tokens: DesignTokens;
  isHighContrastMode: boolean;
  toggleHighContrast: () => void;
}