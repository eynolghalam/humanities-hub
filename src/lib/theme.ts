// Theme configuration with multiple color schemes
export type ThemeName = 'light' | 'dark' | 'green' | 'blue' | 'purple' | 'orange';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  surface: string;
  primary: string;
  primaryForeground: string;
  primaryGlow: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
}

const themes: Record<ThemeName, ThemeColors> = {
  light: {
    background: 'oklch(0.985 0.005 95)',
    foreground: 'oklch(0.18 0.03 270)',
    surface: 'oklch(1 0 0)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.18 0.03 270)',
    primary: 'oklch(0.42 0.16 275)',
    primaryForeground: 'oklch(0.985 0.005 95)',
    primaryGlow: 'oklch(0.62 0.18 295)',
    secondary: 'oklch(0.95 0.015 95)',
    secondaryForeground: 'oklch(0.22 0.03 270)',
    accent: 'oklch(0.72 0.16 65)',
    accentForeground: 'oklch(0.18 0.03 270)',
    muted: 'oklch(0.95 0.01 270)',
    mutedForeground: 'oklch(0.48 0.02 270)',
    destructive: 'oklch(0.58 0.22 27)',
    destructiveForeground: 'oklch(0.985 0 0)',
    border: 'oklch(0.9 0.012 270)',
  },
  dark: {
    background: 'oklch(0.15 0.02 270)',
    foreground: 'oklch(0.95 0.01 270)',
    surface: 'oklch(0.22 0.02 270)',
    card: 'oklch(0.22 0.02 270)',
    cardForeground: 'oklch(0.95 0.01 270)',
    primary: 'oklch(0.62 0.18 295)',
    primaryForeground: 'oklch(0.15 0.02 270)',
    primaryGlow: 'oklch(0.82 0.15 300)',
    secondary: 'oklch(0.25 0.02 270)',
    secondaryForeground: 'oklch(0.9 0.01 270)',
    accent: 'oklch(0.72 0.16 65)',
    accentForeground: 'oklch(0.15 0.02 270)',
    muted: 'oklch(0.35 0.01 270)',
    mutedForeground: 'oklch(0.65 0.01 270)',
    destructive: 'oklch(0.68 0.22 27)',
    destructiveForeground: 'oklch(0.15 0.02 270)',
    border: 'oklch(0.3 0.02 270)',
  },
  green: {
    background: 'oklch(0.98 0.004 120)',
    foreground: 'oklch(0.18 0.03 120)',
    surface: 'oklch(0.97 0.005 120)',
    card: 'oklch(0.97 0.005 120)',
    cardForeground: 'oklch(0.18 0.03 120)',
    primary: 'oklch(0.45 0.18 130)',
    primaryForeground: 'oklch(0.98 0.004 120)',
    primaryGlow: 'oklch(0.62 0.18 140)',
    secondary: 'oklch(0.95 0.012 120)',
    secondaryForeground: 'oklch(0.22 0.03 120)',
    accent: 'oklch(0.68 0.16 140)',
    accentForeground: 'oklch(0.18 0.03 120)',
    muted: 'oklch(0.94 0.008 120)',
    mutedForeground: 'oklch(0.48 0.02 120)',
    destructive: 'oklch(0.58 0.22 27)',
    destructiveForeground: 'oklch(0.98 0 0)',
    border: 'oklch(0.9 0.01 120)',
  },
  blue: {
    background: 'oklch(0.97 0.005 250)',
    foreground: 'oklch(0.18 0.03 250)',
    surface: 'oklch(0.97 0.005 250)',
    card: 'oklch(0.97 0.005 250)',
    cardForeground: 'oklch(0.18 0.03 250)',
    primary: 'oklch(0.42 0.16 260)',
    primaryForeground: 'oklch(0.97 0.005 250)',
    primaryGlow: 'oklch(0.62 0.18 265)',
    secondary: 'oklch(0.94 0.015 250)',
    secondaryForeground: 'oklch(0.22 0.03 250)',
    accent: 'oklch(0.68 0.16 250)',
    accentForeground: 'oklch(0.18 0.03 250)',
    muted: 'oklch(0.93 0.01 250)',
    mutedForeground: 'oklch(0.48 0.02 250)',
    destructive: 'oklch(0.58 0.22 27)',
    destructiveForeground: 'oklch(0.97 0 0)',
    border: 'oklch(0.89 0.012 250)',
  },
  purple: {
    background: 'oklch(0.96 0.006 280)',
    foreground: 'oklch(0.18 0.03 280)',
    surface: 'oklch(0.96 0.006 280)',
    card: 'oklch(0.96 0.006 280)',
    cardForeground: 'oklch(0.18 0.03 280)',
    primary: 'oklch(0.44 0.16 290)',
    primaryForeground: 'oklch(0.96 0.006 280)',
    primaryGlow: 'oklch(0.62 0.18 295)',
    secondary: 'oklch(0.93 0.018 280)',
    secondaryForeground: 'oklch(0.22 0.03 280)',
    accent: 'oklch(0.7 0.16 310)',
    accentForeground: 'oklch(0.18 0.03 280)',
    muted: 'oklch(0.92 0.01 280)',
    mutedForeground: 'oklch(0.48 0.02 280)',
    destructive: 'oklch(0.58 0.22 27)',
    destructiveForeground: 'oklch(0.96 0 0)',
    border: 'oklch(0.88 0.012 280)',
  },
  orange: {
    background: 'oklch(0.98 0.005 50)',
    foreground: 'oklch(0.18 0.03 50)',
    surface: 'oklch(0.98 0.005 50)',
    card: 'oklch(0.98 0.005 50)',
    cardForeground: 'oklch(0.18 0.03 50)',
    primary: 'oklch(0.55 0.18 30)',
    primaryForeground: 'oklch(0.98 0.005 50)',
    primaryGlow: 'oklch(0.65 0.18 35)',
    secondary: 'oklch(0.95 0.015 50)',
    secondaryForeground: 'oklch(0.22 0.03 50)',
    accent: 'oklch(0.75 0.18 40)',
    accentForeground: 'oklch(0.18 0.03 50)',
    muted: 'oklch(0.94 0.01 50)',
    mutedForeground: 'oklch(0.48 0.02 50)',
    destructive: 'oklch(0.58 0.22 27)',
    destructiveForeground: 'oklch(0.98 0 0)',
    border: 'oklch(0.9 0.012 50)',
  },
};

export function getTheme(themeName: ThemeName): ThemeColors {
  return themes[themeName];
}

export function applyTheme(themeName: ThemeName) {
  const theme = getTheme(themeName);
  const root = document.documentElement;

  // Map of theme property names to CSS variable names (without color- prefix)
  const cssVarMap: Record<keyof ThemeColors, string> = {
    background: 'background',
    foreground: 'foreground',
    surface: 'surface',
    card: 'card',
    cardForeground: 'card-foreground',
    primary: 'primary',
    primaryForeground: 'primary-foreground',
    primaryGlow: 'primary-glow',
    secondary: 'secondary',
    secondaryForeground: 'secondary-foreground',
    accent: 'accent',
    accentForeground: 'accent-foreground',
    muted: 'muted',
    mutedForeground: 'muted-foreground',
    destructive: 'destructive',
    destructiveForeground: 'destructive-foreground',
    border: 'border',
  };

  Object.entries(theme).forEach(([key, value]) => {
    const cssVarName = cssVarMap[key as keyof ThemeColors];
    root.style.setProperty(`--${cssVarName}`, value);
  });

  // Update gradient colors based on theme
  const gradientHero = `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryGlow} 60%, ${theme.accent} 100%)`;
  const gradientCard = `linear-gradient(160deg, ${theme.card} 0%, ${theme.surface} 100%)`;
  
  root.style.setProperty('--gradient-hero', gradientHero);
  root.style.setProperty('--gradient-card', gradientCard);

  // Store theme preference in localStorage
  localStorage.setItem('preferred-theme', themeName);
  root.setAttribute('data-theme', themeName);
}

export function getStoredTheme(): ThemeName | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('preferred-theme');
  return (stored as ThemeName) || null;
}

export function getSystemTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialTheme(): ThemeName {
  const stored = getStoredTheme();
  if (stored) return stored;
  return getSystemTheme();
}

export const themeNames: { name: ThemeName; label: string; emoji: string }[] = [
  { name: 'light', label: 'روشن', emoji: '☀️' },
  { name: 'dark', label: 'تاریک', emoji: '🌙' },
  { name: 'green', label: 'سبز', emoji: '🌿' },
  { name: 'blue', label: 'آبی', emoji: '🌊' },
  { name: 'purple', label: 'بنفش', emoji: '💜' },
  { name: 'orange', label: 'نارنجی', emoji: '🧡' },
];
