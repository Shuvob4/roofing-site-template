/**
 * Theme Generator Utility
 *
 * Converts theme configuration (from theme.yaml) into CSS custom properties.
 * Pure function — no side effects, no file I/O.
 */

/** Theme configuration matching the theme collection schema in content.config.ts */
export interface ThemeConfig {
  mode: 'dark' | 'light';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    emergency?: string;
  };
  fonts: {
    heading: string;
    body: string;
    scale: {
      small: string;
      base: string;
      large: string;
      display: string;
    };
  };
  sectionDividerStyle: 'none' | 'diagonal' | 'wave';
  borderRadius: string;
  breakpoints?: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * Determines an appropriate contrasting text color for a given background.
 * Uses relative luminance to decide between the theme's text and background colors.
 * Falls back to #fff / #000 if parsing fails.
 */
function getContrastingTextColor(bgHex: string, lightText: string, darkText: string): string {
  const hex = bgHex.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) {
    // Can't parse — fall back based on assumption
    return lightText;
  }
  const fullHex = hex.length === 3
    ? hex.split('').map(c => c + c).join('')
    : hex;
  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;
  // Relative luminance (sRGB)
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  // Dark backgrounds need light text, light backgrounds need dark text
  return luminance > 0.4 ? darkText : lightText;
}

/**
 * Generates a CSS `:root { ... }` block with custom properties derived from the theme config.
 *
 * Each named token produces exactly one `--`-prefixed CSS custom property.
 * Optional fields (e.g. `colors.emergency`, `breakpoints`) are omitted from output when undefined.
 * No hardcoded values — everything comes from the config parameter.
 */
export function generateCSSCustomProperties(config: ThemeConfig): string {
  const properties: string[] = [];

  // Mode / color scheme
  properties.push(`  --color-scheme: ${config.mode};`);

  // Colors
  properties.push(`  --color-primary: ${config.colors.primary};`);
  properties.push(`  --color-secondary: ${config.colors.secondary};`);
  properties.push(`  --color-accent: ${config.colors.accent};`);
  properties.push(`  --color-background: ${config.colors.background};`);
  properties.push(`  --color-text: ${config.colors.text};`);

  if (config.colors.emergency !== undefined) {
    properties.push(`  --color-emergency: ${config.colors.emergency};`);
  }

  // Contrast text colors — for use on colored backgrounds (buttons, CTAs)
  // These are computed from the accent/emergency background to ensure readability.
  // On saturated accent backgrounds, we want maximum contrast text (white on dark, black on light).
  const onAccentColor = getContrastingTextColor(config.colors.accent, '#ffffff', '#000000');
  properties.push(`  --color-on-accent: ${onAccentColor};`);

  if (config.colors.emergency !== undefined) {
    const onEmergencyColor = getContrastingTextColor(config.colors.emergency, '#ffffff', '#000000');
    properties.push(`  --color-on-emergency: ${onEmergencyColor};`);
  }

  // Fonts
  properties.push(`  --font-heading: ${config.fonts.heading};`);
  properties.push(`  --font-body: ${config.fonts.body};`);

  // Font scale
  properties.push(`  --font-size-small: ${config.fonts.scale.small};`);
  properties.push(`  --font-size-base: ${config.fonts.scale.base};`);
  properties.push(`  --font-size-large: ${config.fonts.scale.large};`);
  properties.push(`  --font-size-display: ${config.fonts.scale.display};`);

  // Border radius
  properties.push(`  --border-radius: ${config.borderRadius};`);

  // Section divider style
  properties.push(`  --section-divider-style: ${config.sectionDividerStyle};`);

  // Breakpoints (optional)
  if (config.breakpoints !== undefined) {
    properties.push(`  --breakpoint-sm: ${config.breakpoints.sm};`);
    properties.push(`  --breakpoint-md: ${config.breakpoints.md};`);
    properties.push(`  --breakpoint-lg: ${config.breakpoints.lg};`);
    properties.push(`  --breakpoint-xl: ${config.breakpoints.xl};`);
  }

  return `:root {\n${properties.join('\n')}\n}`;
}
