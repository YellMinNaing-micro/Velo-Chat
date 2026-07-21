export const lightColors = {
  background: '#F4F7F6', surface: '#FFFFFF', surfaceMuted: '#EDF3F1',
  text: '#17211F', textMuted: '#74817E', border: '#DDE6E3',
  primary: '#10A99A', primaryDark: '#087D73', primarySoft: '#DDF5F1',
  danger: '#D94A56', dangerSoft: '#FFF0F1', warning: '#EE792D', success: '#22A46F',
} as const;

export const darkColors: ThemeColors = {
  background: '#0D1211', surface: '#141A19', surfaceMuted: '#202826',
  text: '#F2F8F6', textMuted: '#91A09C', border: '#2B3633',
  primary: '#25C4B4', primaryDark: '#72E5DA', primarySoft: '#173A36',
  danger: '#FF858C', dangerSoft: '#3A2024', warning: '#FF9B5A', success: '#46D49A',
};

export type ThemeColors = { [K in keyof typeof lightColors]: string };
