export interface FontOption {
  name: string;
  family: string;
  googleFont: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    name: 'Yuyu Short',
    family: '"Yuyu Short", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    googleFont: 'Yuyu+Short',
  },
  {
    name: 'Inter',
    family: '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    googleFont: 'Inter',
  },
  {
    name: 'Poppins',
    family: '"Poppins", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    googleFont: 'Poppins',
  },
  {
    name: 'Roboto',
    family: '"Roboto", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    googleFont: 'Roboto',
  },
];

export const DEFAULT_FONT = FONT_OPTIONS[0].family;
export const FONT_FAMILY = DEFAULT_FONT;
