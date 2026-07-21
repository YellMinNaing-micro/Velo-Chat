import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import type { ThemeColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { getApiError } from '@/services/api';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Email/username and password are required.');
    setLoading(true); setError('');
    try { await login(email.trim(), password); }
    catch (err) { setError(getApiError(err, 'Unable to sign in.')); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <BrandLogo />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in and continue your conversations.</Text>
          </View>
          <View style={styles.form}>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <FormField autoComplete="email" icon="mail-outline" keyboardType="email-address" label="Email or username" onChangeText={setEmail} placeholder="you@example.com" value={email} />
            <FormField autoComplete="password" icon="lock-closed-outline" label="Password" onChangeText={setPassword} onSubmitEditing={submit} placeholder="Your password" returnKeyType="done" secureTextEntry value={password} />
            <PrimaryButton label="Sign in" loading={loading} onPress={submit} />
          </View>
          <Text style={styles.footer}>New to Velo Chat? <Link href="/(auth)/register" style={styles.link}>Create account</Link></Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 }, flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  hero: { gap: 10, marginBottom: 38 },
  title: { color: colors.text, fontSize: 36, fontWeight: '900', letterSpacing: -1.4, marginTop: 18 },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  form: { gap: 18 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 12, color: colors.danger, fontSize: 13, lineHeight: 18, padding: 13 },
  footer: { color: colors.textMuted, fontSize: 14, marginTop: 28, textAlign: 'center' },
  link: { color: colors.primaryDark, fontWeight: '800' },
});
