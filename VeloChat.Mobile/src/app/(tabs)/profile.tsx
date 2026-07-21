import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import type { ThemeColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { api, getApiError } from '@/services/api';
import type { UserProfile } from '@/types/api';

type Panel = 'view' | 'edit' | 'password';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const { colors, mode, setMode } = useAppTheme();
  const styles = createStyles(colors);
  const profileValues = () => ({ username: user?.username || '', email: user?.email || '', fullName: user?.fullName || '', profilePictureUrl: user?.profilePictureUrl || '' });
  const [panel, setPanel] = useState<Panel>('view');
  const [form, setForm] = useState(profileValues);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updatePassword = (key: keyof typeof passwords) => (value: string) => setPasswords((current) => ({ ...current, [key]: value }));

  const openPanel = (next: Panel) => {
    setMessage('');
    if (next === 'edit') setForm(profileValues());
    if (next === 'password') setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPanel(next);
  };

  const save = async () => {
    setSaving(true); setMessage('');
    try {
      const response = await api.put<UserProfile>('/api/auth/me', form);
      updateProfile(response.data);
      setPanel('view');
      setMessage('Profile updated successfully.');
    } catch (error) { setMessage(getApiError(error, 'Unable to update profile.')); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (passwords.newPassword.length < 6) return setMessage('New password must be at least 6 characters.');
    if (passwords.newPassword !== passwords.confirmPassword) return setMessage('New passwords do not match.');
    setSaving(true); setMessage('');
    try {
      await api.post('/api/auth/change-password', { oldPassword: passwords.oldPassword, newPassword: passwords.newPassword });
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPanel('view');
      setMessage('Password changed successfully.');
    } catch (error) { setMessage(getApiError(error, 'Unable to change password.')); }
    finally { setSaving(false); }
  };

  const confirmLogout = () => Alert.alert('Log out?', 'You will need to sign in again on this device.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout },
  ]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <View>{panel !== 'view' && <Pressable onPress={() => openPanel('view')} style={styles.back}><Ionicons color={colors.text} name="chevron-back" size={21} /><Text style={styles.backText}>Profile</Text></Pressable>}{panel === 'view' && <Text style={styles.title}>Profile</Text>}</View>
            <Pressable onPress={confirmLogout} style={styles.logout}><Ionicons color={colors.danger} name="log-out-outline" size={20} /><Text style={styles.logoutText}>Log out</Text></Pressable>
          </View>

          <View style={styles.card}><Avatar imageUrl={user?.profilePictureUrl} name={user?.fullName || user?.username} online size={82} /><View style={styles.identity}><Text style={styles.displayName}>{user?.fullName || user?.username}</Text><Text style={styles.handle}>@{user?.username}</Text><Text style={styles.email}>{user?.email}</Text></View></View>
          {!!message && <Text style={styles.notice}>{message}</Text>}

          {panel === 'view' && <View style={styles.sections}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <Pressable onPress={() => openPanel('edit')} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><View style={styles.menuIcon}><Ionicons color={colors.primaryDark} name="person-outline" size={21} /></View><View style={styles.menuCopy}><Text style={styles.menuTitle}>Edit profile</Text><Text style={styles.menuDescription}>Name, username, email and profile photo</Text></View><Ionicons color={colors.textMuted} name="chevron-forward" size={20} /></Pressable>
            <Pressable onPress={() => openPanel('password')} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><View style={styles.menuIcon}><Ionicons color={colors.primaryDark} name="lock-closed-outline" size={21} /></View><View style={styles.menuCopy}><Text style={styles.menuTitle}>Change password</Text><Text style={styles.menuDescription}>Update your account password securely</Text></View><Ionicons color={colors.textMuted} name="chevron-forward" size={20} /></Pressable>

            <Text style={[styles.sectionLabel, styles.appearanceLabel]}>APPEARANCE</Text>
            <View style={styles.themeCard}><View style={styles.themeHeading}><View style={styles.menuIcon}><Ionicons color={colors.primaryDark} name={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={21} /></View><View style={styles.menuCopy}><Text style={styles.menuTitle}>App theme</Text><Text style={styles.menuDescription}>Choose how Velo Chat looks</Text></View></View><View style={styles.segment}><Pressable onPress={() => setMode('light')} style={[styles.segmentButton, mode === 'light' && styles.segmentActive]}><Ionicons color={mode === 'light' ? '#FFFFFF' : colors.textMuted} name="sunny-outline" size={17} /><Text style={[styles.segmentText, mode === 'light' && styles.segmentTextActive]}>Light</Text></Pressable><Pressable onPress={() => setMode('dark')} style={[styles.segmentButton, mode === 'dark' && styles.segmentActive]}><Ionicons color={mode === 'dark' ? '#FFFFFF' : colors.textMuted} name="moon-outline" size={17} /><Text style={[styles.segmentText, mode === 'dark' && styles.segmentTextActive]}>Dark</Text></Pressable></View></View>
          </View>}

          {panel === 'edit' && <View style={styles.form}>
            <Text style={styles.panelTitle}>Edit profile</Text>
            <FormField icon="at-outline" label="Username" onChangeText={update('username')} value={form.username} />
            <FormField icon="mail-outline" keyboardType="email-address" label="Email" onChangeText={update('email')} value={form.email} />
            <FormField autoCapitalize="words" icon="person-outline" label="Full name" onChangeText={update('fullName')} value={form.fullName} />
            <FormField icon="image-outline" keyboardType="url" label="Profile picture URL" onChangeText={update('profilePictureUrl')} placeholder="https://..." value={form.profilePictureUrl} />
            <PrimaryButton label="Save changes" loading={saving} onPress={save} />
          </View>}

          {panel === 'password' && <View style={styles.form}>
            <Text style={styles.panelTitle}>Change password</Text><Text style={styles.panelCopy}>Enter your current password before choosing a new one.</Text>
            <FormField autoComplete="current-password" icon="key-outline" label="Current password" onChangeText={updatePassword('oldPassword')} secureTextEntry value={passwords.oldPassword} />
            <FormField autoComplete="new-password" icon="lock-closed-outline" label="New password" onChangeText={updatePassword('newPassword')} secureTextEntry value={passwords.newPassword} />
            <FormField autoComplete="new-password" icon="checkmark-circle-outline" label="Confirm new password" onChangeText={updatePassword('confirmPassword')} secureTextEntry value={passwords.confirmPassword} />
            <PrimaryButton label="Change password" loading={saving} onPress={changePassword} />
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 }, flex: { flex: 1 }, content: { padding: 20, paddingBottom: 42 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 42 }, title: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1 }, back: { alignItems: 'center', flexDirection: 'row', gap: 3 }, backText: { color: colors.text, fontSize: 17, fontWeight: '800' },
  logout: { alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: 11, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 }, logoutText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  card: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 22, flexDirection: 'row', gap: 18, marginVertical: 24, padding: 20 }, identity: { flex: 1, gap: 4 }, displayName: { color: colors.text, fontSize: 21, fontWeight: '900' }, handle: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' }, email: { color: colors.textMuted, fontSize: 12 },
  notice: { backgroundColor: colors.primarySoft, borderRadius: 11, color: colors.primaryDark, fontSize: 13, marginBottom: 16, padding: 12 }, sections: { gap: 10 }, sectionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.9, marginBottom: 2 }, appearanceLabel: { marginTop: 14 },
  menuRow: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 16, flexDirection: 'row', gap: 13, padding: 15 }, pressed: { opacity: 0.75 }, menuIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 12, height: 42, justifyContent: 'center', width: 42 }, menuCopy: { flex: 1, gap: 3 }, menuTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, menuDescription: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  themeCard: { backgroundColor: colors.surfaceMuted, borderRadius: 16, gap: 14, padding: 15 }, themeHeading: { alignItems: 'center', flexDirection: 'row', gap: 13 }, segment: { backgroundColor: colors.background, borderRadius: 12, flexDirection: 'row', padding: 4 }, segmentButton: { alignItems: 'center', borderRadius: 9, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 10 }, segmentActive: { backgroundColor: colors.primary }, segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' }, segmentTextActive: { color: '#FFFFFF' },
  form: { gap: 16 }, panelTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 2 }, panelCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 2 },
});
