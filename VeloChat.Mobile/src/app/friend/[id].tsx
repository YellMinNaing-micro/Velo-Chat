import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import type { ThemeColors } from '@/constants/colors';
import { useAppTheme } from '@/context/theme-context';
import { api, getApiError } from '@/services/api';
import type { ChatRoom, FriendProfile } from '@/types/api';

export default function FriendProfileScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; fullName?: string; avatar?: string }>();
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<FriendProfile>(`/api/friendships/profile/${params.id}`)
      .then((response) => { if (active) setProfile(response.data); })
      .catch((reason) => { if (active) setError(getApiError(reason, 'Unable to load this profile.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  const username = profile?.userName || params.name || 'Friend';
  const displayName = profile?.fullName || params.fullName || username;
  const avatar = profile?.profilePictureUrl || params.avatar;
  const openChat = async () => {
    setOpeningChat(true); setError('');
    try {
      const response = await api.post<ChatRoom>(`/api/chatrooms/dm/${params.id}`);
      router.replace({ pathname: '/chat/[id]', params: { id: response.data.id, name: username, avatar: avatar || '' } });
    } catch (reason) { setError(getApiError(reason, 'Unable to open this chat.')); setOpeningChat(false); }
  };
  const gradient = mode === 'dark' ? ['#63483E', '#2A211E', colors.background] as const : ['#FFE2D2', '#FFF2EA', colors.background] as const;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={gradient} style={styles.hero}>
          <View style={styles.nav}><Pressable onPress={() => router.back()} style={styles.navButton}><Ionicons color={colors.text} name="chevron-back" size={23} /></Pressable><Text style={styles.navTitle}>Friend profile</Text><View style={styles.navButton} /></View>
          {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : <>
            <View style={styles.avatarRing}><Avatar imageUrl={avatar} name={displayName} online={profile?.isOnline} size={104} /></View>
            <Text style={styles.name}>{displayName}</Text><Text style={styles.handle}>@{username}</Text>
            <View style={styles.stats}><View style={styles.stat}><Text style={styles.statLabel}>STATUS</Text><Text style={[styles.statValue, profile?.isOnline && styles.online]}>{profile?.isOnline ? '● Online' : 'Offline'}</Text></View><View style={styles.divider} /><View style={styles.stat}><Text style={styles.statLabel}>FRIENDS SINCE</Text><Text style={styles.statValue}>{profile?.friendsSince ? new Date(profile.friendsSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}</Text></View><View style={styles.divider} /><View style={styles.stat}><Text style={styles.statLabel}>NETWORK</Text><Text style={styles.statValue}>Velo</Text></View></View>
          </>}
        </LinearGradient>

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable disabled={openingChat || loading} onPress={openChat} style={({ pressed }) => [styles.messageButton, pressed && styles.pressed, (openingChat || loading) && styles.disabled]}>{openingChat ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons color="#FFFFFF" name="chatbubble-ellipses" size={19} /><Text style={styles.messageText}>Message {displayName.split(' ')[0]}</Text></>}</Pressable>

        <Text style={styles.sectionLabel}>PROFILE</Text>
        <View style={styles.infoCard}><View style={styles.infoRow}><View style={styles.infoIcon}><Ionicons color={colors.primaryDark} name="person-outline" size={20} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>Display name</Text><Text style={styles.infoValue}>{displayName}</Text></View></View><View style={styles.rowDivider} /><View style={styles.infoRow}><View style={styles.infoIcon}><Ionicons color={colors.primaryDark} name="at-outline" size={20} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>Username</Text><Text style={styles.infoValue}>@{username}</Text></View></View><View style={styles.rowDivider} /><View style={styles.infoRow}><View style={styles.infoIcon}><Ionicons color={colors.primaryDark} name="shield-checkmark-outline" size={20} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>Connection</Text><Text style={styles.infoValue}>Accepted Velo friend</Text></View></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { paddingBottom: 34 }, hero: { alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, minHeight: 365, overflow: 'hidden', paddingBottom: 20 }, nav: { alignItems: 'center', alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 }, navButton: { alignItems: 'center', backgroundColor: `${colors.surface}99`, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, navTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, loading: { marginTop: 100 },
  avatarRing: { borderColor: `${colors.surface}CC`, borderRadius: 60, borderWidth: 4, marginTop: 13, padding: 3 }, name: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 12 }, handle: { color: colors.textMuted, fontSize: 13, marginTop: 3 }, stats: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: `${colors.surface}B8`, borderColor: `${colors.border}AA`, borderRadius: 17, borderWidth: 1, flexDirection: 'row', marginHorizontal: 18, marginTop: 20, paddingVertical: 14 }, stat: { alignItems: 'center', flex: 1, gap: 5 }, statLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }, statValue: { color: colors.text, fontSize: 12, fontWeight: '800' }, online: { color: colors.success }, divider: { backgroundColor: colors.border, height: 28, width: 1 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 12, color: colors.danger, fontSize: 12, marginHorizontal: 18, marginTop: 16, padding: 12 }, messageButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', margin: 18, minHeight: 54 }, messageText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, pressed: { transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.65 },
  sectionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 20 }, infoCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginHorizontal: 18, overflow: 'hidden' }, infoRow: { alignItems: 'center', flexDirection: 'row', gap: 13, padding: 15 }, infoIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 11, height: 40, justifyContent: 'center', width: 40 }, infoCopy: { flex: 1, gap: 3 }, infoLabel: { color: colors.textMuted, fontSize: 10 }, infoValue: { color: colors.text, fontSize: 14, fontWeight: '800' }, rowDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 68 },
});
