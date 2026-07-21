import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { getApiError } from '@/services/api';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', fullName: '', email: '', password: '', profilePictureUrl: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password) return setError('Username, email and password are required.');
    setLoading(true); setError('');
    try { await register(form); router.replace('/(auth)/login'); }
    catch (err) { setError(getApiError(err, 'Unable to create your account.')); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandLogo />
          <View style={styles.heading}><Text style={styles.title}>Create your account</Text><Text style={styles.subtitle}>A few details and you&apos;re ready to chat.</Text></View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.form}>
            <FormField autoCapitalize="none" icon="at-outline" label="Username" onChangeText={update('username')} placeholder="choose_username" value={form.username} />
            <FormField autoCapitalize="words" icon="person-outline" label="Full name (optional)" onChangeText={update('fullName')} placeholder="Your name" value={form.fullName} />
            <FormField autoComplete="email" icon="mail-outline" keyboardType="email-address" label="Email" onChangeText={update('email')} placeholder="you@example.com" value={form.email} />
            <FormField autoComplete="new-password" icon="lock-closed-outline" label="Password" onChangeText={update('password')} placeholder="6+ characters" secureTextEntry value={form.password} />
            <FormField icon="image-outline" keyboardType="url" label="Photo URL (optional)" onChangeText={update('profilePictureUrl')} placeholder="https://..." value={form.profilePictureUrl} />
            <PrimaryButton label="Create account" loading={loading} onPress={submit} />
          </View>
          <Text style={styles.footer}>Already have an account? <Link href="/(auth)/login" style={styles.link}>Sign in</Link></Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 }, flex: { flex: 1 }, content: { padding: 28, paddingBottom: 42 },
  heading: { gap: 7, marginBottom: 26, marginTop: 26 }, title: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1.1 },
  subtitle: { color: colors.textMuted, fontSize: 15 }, form: { gap: 16 },
  error: { backgroundColor: '#FFF0F1', borderRadius: 12, color: colors.danger, fontSize: 13, marginBottom: 16, padding: 13 },
  footer: { color: colors.textMuted, fontSize: 14, marginTop: 26, textAlign: 'center' }, link: { color: colors.primaryDark, fontWeight: '800' },
});
