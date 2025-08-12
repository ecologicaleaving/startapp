/**
 * Typography Components - Enhanced Hierarchical System
 * Exports all typography components for outdoor referee tool
 */

// Base typography component and types
export { 
  Text, 
  type TextProps, 
  type TextVariant, 
  type TextColor 
} from './Text';

// Original semantic components (from Stories 1.1 & 1.2)
export {
  HeroText,
  H1Text,
  H2Text,
  BodyLargeText,
  BodyText,
  CaptionText,
} from './Text';

// Enhanced semantic components (Story 1.3)
export {
  Title,
  Heading,
  Subheading,
  EnhancedBodyText,
  EnhancedCaption,
} from './Text';

// Typography utilities
export type {
  EmphasisLevel,
  InformationHierarchy,
  ScanningPattern,
} from '../../utils/typography';