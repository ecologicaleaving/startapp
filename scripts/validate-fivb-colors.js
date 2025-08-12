/**
 * Validate FIVB Brand Colors for WCAG AAA Compliance
 * Check if brand colors need adjustment to meet 7:1 contrast requirement
 */

// FIVB Brand Colors
const fivbColors = {
  primary: '#1B365D',
  secondary: '#4A90A4', 
  accent: '#FF6B35',
  success: '#2E8B57',
  warning: '#FF8C00',
  error: '#C41E3A',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  background: '#FFFFFF',
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance
function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// Calculate contrast ratio
function calculateContrastRatio(color1, color2) {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Validate all FIVB colors against white background
console.log('FIVB Brand Color Contrast Validation (vs White Background):');
console.log('='.repeat(60));

Object.entries(fivbColors).forEach(([name, color]) => {
  if (name === 'background') return; // Skip background color
  
  const ratio = calculateContrastRatio(color, fivbColors.background);
  const wcagAA = ratio >= 4.5;
  const wcagAAA = ratio >= 7.0;
  
  console.log(`${name.padEnd(15)} ${color.padEnd(10)} ${ratio.toFixed(2)}:1 ${wcagAA ? '✅AA' : '❌AA'} ${wcagAAA ? '✅AAA' : '❌AAA'}`);
});

// Check text colors on brand backgrounds
console.log('\nText Colors on Brand Backgrounds:');
console.log('='.repeat(60));

const brandBgs = ['primary', 'secondary', 'accent', 'success', 'warning', 'error'];
brandBgs.forEach(bgName => {
  const whiteRatio = calculateContrastRatio('#FFFFFF', fivbColors[bgName]);
  const blackRatio = calculateContrastRatio('#000000', fivbColors[bgName]);
  
  const bestColor = whiteRatio > blackRatio ? 'white' : 'black';
  const bestRatio = Math.max(whiteRatio, blackRatio);
  const wcagAAA = bestRatio >= 7.0;
  
  console.log(`${bgName.padEnd(15)} ${fivbColors[bgName].padEnd(10)} Best: ${bestColor.padEnd(5)} ${bestRatio.toFixed(2)}:1 ${wcagAAA ? '✅AAA' : '❌AAA'}`);
});