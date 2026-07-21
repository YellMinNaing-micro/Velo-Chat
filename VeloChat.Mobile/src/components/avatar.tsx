import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/colors';
import { useAppTheme } from '@/context/theme-context';

type Props = {
  name?: string | null;
  imageUrl?: string | null;
  size?: number;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ name, imageUrl, size = 48, online, style }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const initials = (name || 'Velo').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <View style={[{ height: size, width: size }, style]}>
      <View style={[styles.avatar, { borderRadius: size / 2, height: size, width: size }]}>
        {imageUrl
          ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} />
          : <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>}
      </View>
      {online && <View style={[styles.online, { height: Math.max(10, size * 0.24), width: Math.max(10, size * 0.24) }]} />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, justifyContent: 'center', overflow: 'hidden' },
  initials: { color: colors.primaryDark, fontWeight: '800' },
  online: { backgroundColor: colors.success, borderColor: colors.surface, borderRadius: 99, borderWidth: 2, bottom: 0, position: 'absolute', right: 0 },
});
