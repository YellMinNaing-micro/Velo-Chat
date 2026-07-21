export const lightColors = {
  background: '#F7F8F8', surface: '#FFFFFF', surfaceMuted: '#F0F2F1',
  text: '#17201F', textMuted: '#78827F', border: '#E7EAE9',
  primary: '#0BA99B', primaryDark: '#087D75', primarySoft: '#E4F8F5',
  danger: '#D94A56', dangerSoft: '#FFF0F1', warning: '#EE792D', success: '#22A46F',
} as const;

export const darkColors: ThemeColors = {
  background: '#0D1413', surface: '#121C1A', surfaceMuted: '#1C2927',
  text: '#F3FAF8', textMuted: '#91A5A1', border: '#293936',
  primary: '#20C7B7', primaryDark: '#64E3D6', primarySoft: '#183B37',
  danger: '#FF7B84', dangerSoft: '#3A2024', warning: '#FF9B5A', success: '#46D49A',
};

export type ThemeColors = { [K in keyof typeof lightColors]: string };
