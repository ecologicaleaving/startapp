# Hierarchical Typography System - Usage Guide

## Overview

The Hierarchical Typography System provides a comprehensive set of components and utilities optimized for outdoor referee tools. This system ensures consistent, scannable typography across all screens while maintaining accessibility standards and outdoor readability.

## Typography Scale

Our typography system is built on a semantic hierarchy designed for quick scanning by tournament referees:

### Scale Sizes
- **Hero**: 40px - Splash screens, major headings, current assignment emphasis
- **H1**: 32px - Screen titles, primary headings, match identifiers  
- **H2**: 24px - Section headers, card titles, team names
- **Body Large**: 18px - Important information, match details
- **Body**: 16px - Standard text content, descriptions, secondary information
- **Caption**: 14px - Metadata, timestamps, status indicators

### Outdoor Optimization Features
- **Minimum Touch Targets**: 44px for interactive text elements
- **Line Height**: 1.4-1.6 for body text, 1.2-1.3 for headings
- **Letter Spacing**: Optimized for sunlight conditions and quick scanning
- **Responsive Scaling**: Adjusts based on device size and pixel density
- **Orientation Support**: Typography maintains hierarchy across orientations

## Core Components

### Basic Typography Components

Import from `./components/Typography`:

```tsx
import { Text, H1Text, H2Text, BodyText, CaptionText } from './components/Typography';
```

#### Usage Examples

```tsx
// Screen titles and primary headings
<H1Text>Active Tournaments</H1Text>

// Section headers and card titles  
<H2Text>Match #{match.NoInTournament}</H2Text>

// Standard content and descriptions
<BodyText style={{ color: '#666' }}>
  Tournament information goes here
</BodyText>

// Metadata and secondary information
<CaptionText>Last updated: 5 minutes ago</CaptionText>
```

### Enhanced Semantic Components

For complex layouts with information hierarchy:

```tsx
import { 
  Title, 
  Heading, 
  Subheading, 
  EnhancedBodyText, 
  EnhancedCaption 
} from './components/Typography';

// With emphasis and hierarchy
<Title emphasis="high" hierarchy="primary">
  Critical Match Alert
</Title>

<Heading scanningPattern="quickScan">
  Assignment Updates
</Heading>
```

### Typography Props

All typography components support these optional props:

- `emphasis`: 'critical' | 'high' | 'medium' | 'low'
- `hierarchy`: 'primary' | 'secondary' | 'tertiary'
- `scanningPattern`: 'quickScan' | 'detailScan' | 'peripheralScan'
- `critical`: boolean - Applies maximum outdoor readability optimizations

## Specialized Typography Components

### MatchCard
Optimized for tournament match display with clear information hierarchy:

```tsx
import { MatchCard } from './components/Typography/MatchCard';

<MatchCard
  matchId="M001"
  teamA="Team Alpha"
  teamB="Team Beta" 
  time="14:30"
  court="Court 1"
  status="live"
  variant="standard"
/>
```

### AssignmentSummary
Referee-centric information display with priority ordering:

```tsx
import { AssignmentSummary } from './components/Typography/AssignmentSummary';

<AssignmentSummary
  refereeRole="R1"
  matchInfo={{ id: "M001", teams: "Team A vs Team B" }}
  scheduleTime="14:30"
  tournamentContext="BPT World Championship"
  variant="compact"
/>
```

### StatusIndicator
Multiple variants for different scanning contexts:

```tsx
import { StatusIndicator } from './components/Typography/StatusIndicator';

// For badge-style status
<StatusIndicator
  status="active"
  variant="badge"
  urgency="immediate"
  context="critical-alert-response"
/>

// For peripheral vision scanning
<StatusIndicator
  status="pending"
  variant="banner"  
  context="peripheral-status-monitor"
/>
```

### InfoPanel
Structured text hierarchy for detailed information:

```tsx
import { InfoPanel } from './components/Typography/InfoPanel';

<InfoPanel
  title="Tournament Details"
  sections={[
    { label: "Date", content: "March 15-17, 2025" },
    { label: "Location", content: "Miami Beach, Florida" },
    { label: "Courts", content: "8 courts available" }
  ]}
  variant="card"
/>
```

## Scanning Patterns

The system includes six context-specific scanning patterns optimized for different referee scenarios:

### 1. Quick Assignment Check
Optimized for 2-second scan of assignment cards:
- **Primary**: 28px, weight 800, tight spacing
- **Secondary**: 20px, weight 600  
- **Use**: Assignment cards, current match display

### 2. Detailed Match Review
For comprehensive match information reading:
- **Primary**: 24px, weight 700
- **Secondary**: 18px, weight 600
- **Use**: Match details, team information

### 3. Peripheral Status Monitor
Background awareness while focused on primary task:
- **Primary**: 22px, bold, wide spacing
- **Use**: Status indicators, notifications

### 4. Critical Alert Response
Maximum visibility for immediate attention:
- **Primary**: 36px, weight 900, text shadow
- **Use**: Emergency alerts, critical updates

### 5. Schedule Overview
Efficient scanning of multiple time slots:
- **Primary**: 18px, weight 700
- **Use**: Schedule grids, tournament brackets

### 6. Result Verification
Accuracy checking of completed matches:
- **Primary**: 22px, weight 700
- **Use**: Score verification, result summaries

### Usage Example

```tsx
import { getScannableTypography } from '../utils/scanningPatterns';

// Get optimized styles for context
const textStyle = getScannableTypography('quick-assignment-check', 'primary');

<Text style={textStyle}>
  R1 - Court 3 - 14:30
</Text>
```

## Text Emphasis Systems

### Information Categories

The system recognizes seven information categories with appropriate emphasis:

- **match-critical**: Game-affecting information (scores, violations)
- **assignment-status**: Referee assignment states and changes
- **time-sensitive**: Schedule updates, timing information  
- **location-change**: Court or venue changes
- **equipment-alert**: Equipment or technical issues
- **administrative**: General tournament information
- **personal-note**: Individual referee notes

### Usage Example

```tsx
import { applyInformationEmphasis } from '../utils/textEmphasis';

const baseStyle = { fontSize: 16, fontWeight: 'normal' };
const emphasizedStyle = applyInformationEmphasis(baseStyle, 'match-critical');

<Text style={emphasizedStyle}>
  Score Updated: Team A leads 21-18
</Text>
```

### Comparative Emphasis

For urgent vs routine information display:

```tsx
import { applyComparativeEmphasis } from '../utils/textEmphasis';

// Urgent information gets visual emphasis
<Text style={applyComparativeEmphasis(baseStyle, true)}>
  Court change: Move to Court 5
</Text>

// Routine information remains standard
<Text style={applyComparativeEmphasis(baseStyle, false)}>
  Match scheduled for 15:30
</Text>
```

## Responsive Typography

### Device Orientation Support

Typography automatically adjusts for landscape/portrait modes:

```tsx
import { getOrientationResponsiveTypography } from '../utils/typography';

const responsiveStyle = getOrientationResponsiveTypography('h1', {
  emphasis: 'high',
  hierarchy: 'primary',
  maintainHierarchy: true
});

<Text style={responsiveStyle}>
  Tournament Title
</Text>
```

### Device Size Scaling

Typography scales based on device size and pixel density:
- **Small devices** (< 375px): 95% scaling
- **Medium devices** (375-414px): 100% scaling  
- **Large devices** (≥ 414px): 105% scaling
- **High DPI displays** (≥ 3x): Additional 2% scaling

## Accessibility Features

### WCAG AAA Compliance
- **Contrast Ratios**: Minimum 7:1 for all text/background combinations
- **Touch Targets**: Minimum 44px for interactive elements
- **Text Scaling**: Supports dynamic text sizing preferences

### Outdoor Readability
- **Letter Spacing**: Optimized for sunlight glare conditions
- **Line Height**: Adequate spacing for quick scanning
- **Font Weights**: Strategic use of bold for critical information

## Performance Optimizations

### StyleSheet Optimization
All typography styles use `StyleSheet.create()` for performance:

```tsx
import { StyleSheet } from 'react-native';
import { getResponsiveTypography } from '../utils/typography';

const styles = StyleSheet.create({
  title: getResponsiveTypography('h1', { emphasis: 'high' }),
  body: getResponsiveTypography('body'),
});
```

### Component Memoization
Typography components use `React.memo` for optimal re-rendering:

```tsx
export const Text = React.memo<TextProps>(({ variant, children, ...props }) => {
  // Component implementation
});
```

## Migration Guide

### From Hardcoded Styles

**Before:**
```tsx
<Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
  Tournament Title
</Text>
```

**After:**
```tsx
<H1Text style={{ color: '#333' }}>
  Tournament Title
</H1Text>
```

### From Legacy Text Components

**Before:**
```tsx
<Text style={styles.heading}>Section Title</Text>
```

**After:**
```tsx
<H2Text>Section Title</H2Text>
```

## Testing

### Typography Component Testing
All typography components include comprehensive tests:

```tsx
// Test responsive scaling
it('should scale typography for different devices', () => {
  const { getByText } = render(<H1Text>Test</H1Text>);
  // Test implementation
});

// Test scanning patterns
it('should apply correct scanning pattern styles', () => {
  const style = getScannableTypography('quick-assignment-check', 'primary');
  expect(style.fontSize).toBe(28);
  expect(style.fontWeight).toBe('800');
});
```

## Best Practices

### 1. Semantic Usage
Always use the most appropriate semantic component:
- Use H1Text for main page titles
- Use H2Text for section headers
- Use BodyText for content
- Use CaptionText for metadata

### 2. Information Hierarchy
Structure information with clear hierarchy:
```tsx
<H1Text>Match Schedule</H1Text>
<H2Text>Court 1 - 14:30</H2Text>
<BodyText>Team Alpha vs Team Beta</BodyText>
<CaptionText>Referee: John Smith</CaptionText>
```

### 3. Context-Appropriate Patterns
Choose scanning patterns based on usage context:
- Quick scans for assignment cards
- Detailed scans for match information
- Peripheral patterns for status indicators

### 4. Consistent Styling
Avoid mixing typography approaches within components:
```tsx
// Good: Consistent semantic components
<H2Text>Title</H2Text>
<BodyText>Description</BodyText>

// Avoid: Mixed approaches  
<H2Text>Title</H2Text>
<Text style={{ fontSize: 16 }}>Description</Text>
```

## Troubleshooting

### Common Issues

1. **Text Not Scaling Properly**
   - Ensure components are wrapped with proper theme provider
   - Check that responsive utilities are imported correctly

2. **Scanning Patterns Not Applied**
   - Verify scanning context matches available patterns
   - Check that pattern utilities are imported from correct path

3. **Accessibility Warnings**
   - Ensure minimum contrast ratios are maintained
   - Verify touch targets meet minimum size requirements

### Debug Utilities

```tsx
// Validate scanning pattern effectiveness
import { validateScanningPattern } from '../utils/scanningPatterns';

const validation = validateScanningPattern('quick-assignment-check', 3, 20);
console.log('Pattern optimal:', validation.isOptimal);
console.log('Warnings:', validation.warnings);
```

## Future Enhancements

### Planned Features
1. **Animation Support**: Smooth transitions for emphasis changes
2. **Localization**: Multi-language typography scaling
3. **Theme Variants**: Light/dark mode typography adaptations
4. **Performance Metrics**: Real-world scanning effectiveness tracking

### Contributing
To contribute typography improvements:
1. Follow semantic component patterns
2. Maintain WCAG AAA accessibility standards  
3. Include comprehensive tests
4. Update documentation with usage examples

---

**Version**: 1.0  
**Last Updated**: 2025-08-12  
**Compatibility**: React Native 0.79.5+, Expo SDK 53+