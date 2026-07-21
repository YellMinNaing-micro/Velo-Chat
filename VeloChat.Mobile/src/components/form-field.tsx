import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '@/constants/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = TextInputProps & { label: string; icon: IconName; error?: string };

export const FormField = forwardRef<TextInput, Props>(function FormField({ label, icon, error, ...props }, ref) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error && styles.fieldError]}>
        <Ionicons color={colors.textMuted} name={icon} size={20} />
        <TextInput
          ref={ref}
          autoCapitalize="none"
          placeholderTextColor="#A2AAA8"
          style={styles.input}
          {...props}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  field: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: 'transparent', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 54, paddingHorizontal: 16 },
  fieldError: { borderColor: colors.danger },
  input: { color: colors.text, flex: 1, fontSize: 16, paddingVertical: 14 },
  error: { color: colors.danger, fontSize: 12 },
});
