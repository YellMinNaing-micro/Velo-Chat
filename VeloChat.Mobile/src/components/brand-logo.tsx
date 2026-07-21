import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = { compact?: boolean; light?: boolean };

export function BrandLogo({ compact = false, light = false }: Props) {
  return (
    <View style={styles.row}>
      <Image source={require('@/assets/images/velo-logo.png')} style={compact ? styles.smallLogo : styles.logo} />
      {!compact && <Text style={[styles.name, light && styles.light]}>Velo Chat</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logo: { height: 48, width: 48 },
  smallLogo: { height: 34, width: 34 },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  light: { color: '#FFFFFF' },
});
