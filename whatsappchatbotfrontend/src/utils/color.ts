export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalizedHex = hex.replace('#', '');
  const value = normalizedHex.length === 3
    ? normalizedHex.split('').map((char) => char + char).join('')
    : normalizedHex;

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return { r, g, b };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function setAccentColorVariables(accentColor: string): void {
  const accentBg = hexToRgba(accentColor, 0.2);
  const accentBgLight = hexToRgba(accentColor, 0.1);
  const accentBgSoft = hexToRgba(accentColor, 0.05);
  const accentBorder = hexToRgba(accentColor, 0.25);
  const accentBorderStrong = hexToRgba(accentColor, 0.45);

  document.documentElement.style.setProperty('--primary-color', accentColor);
  document.documentElement.style.setProperty('--accent-color', accentColor);
  document.documentElement.style.setProperty('--primary-hover', accentColor);
  document.documentElement.style.setProperty('--accent-hover', accentColor);
  document.documentElement.style.setProperty('--accent-bg', accentBg);
  document.documentElement.style.setProperty('--accent-bg-light', accentBgLight);
  document.documentElement.style.setProperty('--accent-bg-soft', accentBgSoft);
  document.documentElement.style.setProperty('--accent-border', accentBorder);
  document.documentElement.style.setProperty('--accent-border-strong', accentBorderStrong);
}
