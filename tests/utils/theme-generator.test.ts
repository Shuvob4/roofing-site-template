import { describe, it, expect } from 'vitest';
import { generateCSSCustomProperties, type ThemeConfig } from '@utils/theme-generator';

const fullConfig: ThemeConfig = {
  mode: 'dark',
  colors: {
    primary: '#1a1f36',
    secondary: '#2d3250',
    accent: '#e63946',
    background: '#0f1219',
    text: '#f8f9fa',
    emergency: '#ff4444',
  },
  fonts: {
    heading: "'Montserrat', sans-serif",
    body: "'Inter', sans-serif",
    scale: {
      small: '0.875rem',
      base: '1rem',
      large: '1.25rem',
      display: '3.5rem',
    },
  },
  sectionDividerStyle: 'diagonal',
  borderRadius: '0.75rem',
};

const minimalConfig: ThemeConfig = {
  mode: 'light',
  colors: {
    primary: '#ffffff',
    secondary: '#eeeeee',
    accent: '#0066cc',
    background: '#fafafa',
    text: '#111111',
  },
  fonts: {
    heading: "'Roboto', sans-serif",
    body: "'Open Sans', sans-serif",
    scale: {
      small: '0.8rem',
      base: '1rem',
      large: '1.5rem',
      display: '4rem',
    },
  },
  sectionDividerStyle: 'none',
  borderRadius: '0.5rem',
};

describe('generateCSSCustomProperties', () => {
  it('wraps output in :root { ... } block', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toMatch(/^:root \{/);
    expect(result).toMatch(/\}$/);
  });

  it('generates --color-scheme from mode', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toContain('--color-scheme: dark;');

    const lightResult = generateCSSCustomProperties(minimalConfig);
    expect(lightResult).toContain('--color-scheme: light;');
  });

  it('generates color custom properties', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toContain('--color-primary: #1a1f36;');
    expect(result).toContain('--color-secondary: #2d3250;');
    expect(result).toContain('--color-accent: #e63946;');
    expect(result).toContain('--color-background: #0f1219;');
    expect(result).toContain('--color-text: #f8f9fa;');
  });

  it('includes emergency color when defined', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toContain('--color-emergency: #ff4444;');
  });

  it('omits emergency color when undefined', () => {
    const result = generateCSSCustomProperties(minimalConfig);
    expect(result).not.toContain('--color-emergency');
    expect(result).not.toContain('--color-on-emergency');
  });

  it('generates font custom properties', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toContain("--font-heading: 'Montserrat', sans-serif;");
    expect(result).toContain("--font-body: 'Inter', sans-serif;");
  });

  it('generates font scale custom properties', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toContain('--font-size-small: 0.875rem;');
    expect(result).toContain('--font-size-base: 1rem;');
    expect(result).toContain('--font-size-large: 1.25rem;');
    expect(result).toContain('--font-size-display: 3.5rem;');
  });

  it('generates border-radius custom property', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toContain('--border-radius: 0.75rem;');
  });

  it('generates section-divider-style custom property', () => {
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toContain('--section-divider-style: diagonal;');

    const noneResult = generateCSSCustomProperties(minimalConfig);
    expect(noneResult).toContain('--section-divider-style: none;');
  });

  it('omits breakpoints when not defined', () => {
    const result = generateCSSCustomProperties(minimalConfig);
    expect(result).not.toContain('--breakpoint-');
  });

  it('includes breakpoints when defined', () => {
    const configWithBreakpoints: ThemeConfig = {
      ...fullConfig,
      breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    };
    const result = generateCSSCustomProperties(configWithBreakpoints);
    expect(result).toContain('--breakpoint-sm: 640px;');
    expect(result).toContain('--breakpoint-md: 768px;');
    expect(result).toContain('--breakpoint-lg: 1024px;');
    expect(result).toContain('--breakpoint-xl: 1280px;');
  });

  it('produces exactly one custom property per token (no duplicates)', () => {
    const result = generateCSSCustomProperties(fullConfig);
    const lines = result.split('\n').filter((l) => l.trim().startsWith('--'));

    // Full config with emergency: 17 properties
    // mode(1) + colors(6) + on-accent(1) + on-emergency(1) + fonts(2) + scale(4) + borderRadius(1) + dividerStyle(1) = 17
    expect(lines).toHaveLength(17);

    // No duplicate property names
    const propNames = lines.map((l) => l.trim().split(':')[0]);
    const uniqueNames = new Set(propNames);
    expect(uniqueNames.size).toBe(propNames.length);
  });

  it('produces correct count without optional fields', () => {
    const result = generateCSSCustomProperties(minimalConfig);
    const lines = result.split('\n').filter((l) => l.trim().startsWith('--'));

    // Without emergency or breakpoints: 15 properties
    // mode(1) + colors(5) + on-accent(1) + fonts(2) + scale(4) + borderRadius(1) + dividerStyle(1) = 15
    expect(lines).toHaveLength(15);
  });

  it('contains no hardcoded values — all values come from config', () => {
    const customConfig: ThemeConfig = {
      mode: 'light',
      colors: {
        primary: '#aabbcc',
        secondary: '#ddeeff',
        accent: '#112233',
        background: '#445566',
        text: '#778899',
        emergency: '#abcdef',
      },
      fonts: {
        heading: "'CustomFont', serif",
        body: "'AnotherFont', monospace",
        scale: {
          small: '0.7rem',
          base: '1.1rem',
          large: '1.6rem',
          display: '5rem',
        },
      },
      sectionDividerStyle: 'wave',
      borderRadius: '1rem',
    };
    const result = generateCSSCustomProperties(customConfig);

    expect(result).toContain('--color-scheme: light;');
    expect(result).toContain('--color-primary: #aabbcc;');
    expect(result).toContain('--color-secondary: #ddeeff;');
    expect(result).toContain('--color-accent: #112233;');
    expect(result).toContain('--color-background: #445566;');
    expect(result).toContain('--color-text: #778899;');
    expect(result).toContain('--color-emergency: #abcdef;');
    expect(result).toContain("--font-heading: 'CustomFont', serif;");
    expect(result).toContain("--font-body: 'AnotherFont', monospace;");
    expect(result).toContain('--font-size-small: 0.7rem;');
    expect(result).toContain('--font-size-base: 1.1rem;');
    expect(result).toContain('--font-size-large: 1.6rem;');
    expect(result).toContain('--font-size-display: 5rem;');
    expect(result).toContain('--border-radius: 1rem;');
    expect(result).toContain('--section-divider-style: wave;');
  });

  it('produces valid CSS syntax (each property ends with semicolon)', () => {
    const result = generateCSSCustomProperties(fullConfig);
    const lines = result.split('\n').filter((l) => l.trim().startsWith('--'));
    for (const line of lines) {
      expect(line.trim()).toMatch(/^--[\w-]+: .+;$/);
    }
  });

  it('matches expected full output format', () => {
    const expected = `:root {
  --color-scheme: dark;
  --color-primary: #1a1f36;
  --color-secondary: #2d3250;
  --color-accent: #e63946;
  --color-background: #0f1219;
  --color-text: #f8f9fa;
  --color-emergency: #ff4444;
  --color-on-accent: #ffffff;
  --color-on-emergency: #ffffff;
  --font-heading: 'Montserrat', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-size-small: 0.875rem;
  --font-size-base: 1rem;
  --font-size-large: 1.25rem;
  --font-size-display: 3.5rem;
  --border-radius: 0.75rem;
  --section-divider-style: diagonal;
}`;
    const result = generateCSSCustomProperties(fullConfig);
    expect(result).toBe(expected);
  });
});
