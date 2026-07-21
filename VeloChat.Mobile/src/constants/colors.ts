export const lightColors = {
  background: '#FBF7F4', surface: '#FFFFFF', surfaceMuted: '#F6F0EC',
  text: '#1D1917', textMuted: '#817773', border: '#EDE3DD',
  primary: '#0BA99B', primaryDark: '#087D75', primarySoft: '#E4F8F5',
  danger: '#D94A56', dangerSoft: '#FFF0F1', warning: '#EE792D', success: '#22A46F',
} as const;

export const darkColors: ThemeColors = {
  background: '#100E0D', surface: '#181412', surfaceMuted: '#261F1C',
  text: '#FFF8F4', textMuted: '#AA9C95', border: '#392F2A',
  primary: '#20C7B7', primaryDark: '#72E5DA', primarySoft: '#193733',
  danger: '#FF858C', dangerSoft: '#3A2024', warning: '#FF9B5A', success: '#46D49A',
};

export type ThemeColors = { [K in keyof typeof lightColors]: string };
