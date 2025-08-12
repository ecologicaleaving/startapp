// Check which status color is failing
const colors = {
  primary: '#1B365D',
  secondary: '#2B5F75',
  accent: '#D14A1F',
  success: '#1E5A3A',
  warning: '#B8530A',
  error: '#8B1538',
  textPrimary: '#2C3E50',
  textSecondary: '#445566',
  background: '#FFFFFF',
};

const statusColors = {
  active: colors.success,
  upcoming: colors.warning,
  completed: colors.textSecondary,
  cancelled: colors.error,
  primary: colors.primary,
  accent: colors.accent,
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

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

function calculateContrastRatio(color1, color2) {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

console.log('Status Colors Contrast Check:');
Object.entries(statusColors).forEach(([status, color]) => {
  const ratio = calculateContrastRatio(color, colors.background);
  console.log(`${status}: ${color} -> ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? '✅' : '❌'}`);
});