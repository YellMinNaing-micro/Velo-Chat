import { Image, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/colors';
import { useAppTheme } from '@/context/theme-context';

type Props = { compact?: boolean; light?: boolean };

export function BrandLogo({ compact = false, light = false }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      <Image source={require('@/assets/images/velo-logo.png')} style={compact ? styles.smallLogo : styles.logo} />
      {!compact && <Text style={[styles.name, light && styles.light]}>Velo Chat</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logo: { height: 48, width: 48 },
  smallLogo: { height: 34, width: 34 },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  light: { color: '#FFFFFF' },
});
