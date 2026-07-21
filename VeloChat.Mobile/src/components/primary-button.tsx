import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/colors';

type Props = { label: string; loading?: boolean; onPress(): void };

export function PrimaryButton({ label, loading, onPress }: Props) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, justifyContent: 'center', minHeight: 54 },
  pressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.7 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
