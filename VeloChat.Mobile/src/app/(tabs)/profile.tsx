import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { api, getApiError } from '@/services/api';
import type { UserProfile } from '@/types/api';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [form, setForm] = useState(() => ({
    username: user?.username || '',
    email: user?.email || '',
    fullName: user?.fullName || '',
    profilePictureUrl: user?.profilePictureUrl || '',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true); setMessage('');
    try { const response = await api.put<UserProfile>('/api/auth/me', form); updateProfile(response.data); setMessage('Profile updated.'); }
    catch (error) { setMessage(getApiError(error, 'Unable to update profile.')); }
    finally { setSaving(false); }
  };
  const confirmLogout = () => Alert.alert('Log out?', 'You will need to sign in again on this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}><Text style={styles.title}>Profile</Text><Pressable onPress={confirmLogout} style={styles.logout}><Ionicons color={colors.danger} name="log-out-outline" size={20} /><Text style={styles.logoutText}>Log out</Text></Pressable></View>
          <View style={styles.card}><Avatar imageUrl={form.profilePictureUrl} name={form.fullName || form.username} online size={82} /><View style={styles.identity}><Text style={styles.displayName}>{form.fullName || form.username}</Text><Text style={styles.handle}>@{form.username}</Text></View></View>
          {!!message && <Text style={styles.notice}>{message}</Text>}
          <View style={styles.form}>
            <FormField icon="at-outline" label="Username" onChangeText={update('username')} value={form.username} />
            <FormField icon="mail-outline" keyboardType="email-address" label="Email" onChangeText={update('email')} value={form.email} />
            <FormField autoCapitalize="words" icon="person-outline" label="Full name" onChangeText={update('fullName')} value={form.fullName} />
            <FormField icon="image-outline" keyboardType="url" label="Profile picture URL" onChangeText={update('profilePictureUrl')} placeholder="https://..." value={form.profilePictureUrl} />
            <PrimaryButton label="Save changes" loading={saving} onPress={save} />
          </View>
          <Text style={styles.security}>Passwords can still be changed from the Velo Chat web settings.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 }, flex: { flex: 1 }, content: { padding: 20, paddingBottom: 42 }, heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, title: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1 }, logout: { alignItems: 'center', backgroundColor: '#FFF0F1', borderRadius: 11, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 }, logoutText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  card: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 22, flexDirection: 'row', gap: 18, marginVertical: 24, padding: 20 }, identity: { flex: 1, gap: 5 }, displayName: { color: colors.text, fontSize: 21, fontWeight: '900' }, handle: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' }, form: { gap: 16 }, notice: { color: colors.primaryDark, fontSize: 13, marginBottom: 16 }, security: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: 'center' },
});
