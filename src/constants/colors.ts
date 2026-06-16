export const Colors = {
  background: '#000000',
  white: '#FFFFFF',
  subtitleGray: '#A1A1AA',
  footerGray: '#71717A',
  secondaryButton: '#1C1C1E',
  secondaryButtonBorder: '#2C2C2E',
  particle: 'rgba(255, 255, 255, 0.9)',
  particleDim: 'rgba(255, 255, 255, 0.4)',
  divider: '#2C2C2E',
} as const;

export type ColorKeys = keyof typeof Colors;
