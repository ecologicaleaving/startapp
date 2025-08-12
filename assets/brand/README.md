# FIVB Brand Assets

## Development Setup

This directory contains the brand asset management system for the FIVB Professional Referee Tool. 

**Current Status: Development Mode**
- Using placeholder assets from the main React Native assets directory
- All brand assets currently point to `assets/images/icon.png` as placeholders

## Production Asset Requirements

When implementing with actual FIVB brand assets, replace the placeholder references in `BrandAssetManager.ts` with:

### Required Assets

1. **Logo Assets**
   - `logo-primary-light.png` - FIVB primary logo for light backgrounds
   - `logo-primary-dark.png` - FIVB primary logo for dark backgrounds  
   - `logo-symbol-light.png` - FIVB symbol only for light backgrounds
   - `logo-symbol-dark.png` - FIVB symbol only for dark backgrounds

2. **Splash Screen Assets**
   - `splash-background.png` - Full screen background for splash
   - `splash-logo.png` - Large logo for splash screen center

3. **App Icons**
   - `app-icon-ios.png` - iOS app icon (1024x1024)
   - `app-icon-android.png` - Android app icon (512x512)

### Asset Specifications

- **Format**: PNG with transparency support
- **Density Variants**: Provide @1x, @2x, @3x versions for optimal display
- **FIVB Compliance**: All assets must be FIVB-approved brand materials
- **Optimization**: Compress for mobile delivery while maintaining quality

### Implementation Steps

1. Obtain FIVB-approved brand assets
2. Place assets in `assets/brand/` directory with correct naming
3. Update `BrandAssetManager.ts` require statements to reference actual assets
4. Test asset loading across iOS and Android
5. Validate brand compliance with FIVB guidelines

## Current Functionality

The brand system is fully functional with placeholder assets and provides:
- Scalable asset loading system
- Performance optimization with preloading
- Responsive sizing for different screen densities
- Professional brand component integration