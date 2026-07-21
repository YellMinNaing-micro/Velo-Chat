import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import type { ThemeColors } from '@/constants/colors';
import { useAppTheme } from '@/context/theme-context';

type Props = { label: string; loading?: boolean; onPress(): void };

export function PrimaryButton({ label, loading, onPress }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, justifyContent: 'center', minHeight: 54 },
  pressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.7 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
