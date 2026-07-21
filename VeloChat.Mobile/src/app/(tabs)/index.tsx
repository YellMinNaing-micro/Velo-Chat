import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BrandLogo } from '@/components/brand-logo';
import type { ThemeColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { api } from '@/services/api';
import type { ChatMessage, ChatRoom, Friend, Participant } from '@/types/api';

type ChatFilter = 'all' | 'online' | 'groups';

function relativeTime(value?: string) {
  if (!value) return '';
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChatsScreen() {
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [latest, setLatest] = useState<Record<string, ChatMessage | undefined>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const [roomResponse, friendResponse] = await Promise.all([
        api.get<ChatRoom[]>('/api/chatrooms/my-rooms'), api.get<Friend[]>('/api/friendships/list'),
      ]);
      setRooms(roomResponse.data); setFriends(friendResponse.data);
      const messages = await Promise.all(roomResponse.data.map(async (room) => {
        try { const response = await api.get<ChatMessage[]>(`/api/messages/room/${room.id}`); return [room.id, response.data.at(-1)] as const; }
        catch { return [room.id, undefined] as const; }
      }));
      setLatest(Object.fromEntries(messages));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const displayPerson = useCallback((room: ChatRoom): Participant | undefined => room.participants?.find((p) => p.userId !== user?.id) ?? room.participants?.[0], [user?.id]);
  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const person = displayPerson(room);
    const title = room.isGroupChat ? room.roomName : person?.userName || room.roomName;
    const matchesFilter = filter === 'all' || (filter === 'groups' ? room.isGroupChat : !!person?.isOnline);
    return matchesFilter && title.toLowerCase().includes(query.trim().toLowerCase());
  }), [displayPerson, filter, query, rooms]);

  const openRoom = (room: ChatRoom) => {
    const person = displayPerson(room);
    router.push({ pathname: '/chat/[id]', params: { id: room.id, name: room.isGroupChat ? room.roomName : person?.userName || room.roomName, avatar: person?.profilePictureUrl || '' } });
  };
  const openFriendProfile = (friend: Friend) => router.push({ pathname: '/friend/[id]', params: { id: friend.id, name: friend.userName, fullName: friend.fullName || '', avatar: friend.profilePictureUrl || '' } });
  const gradient = mode === 'dark' ? ['#513B33', '#2A211E', colors.background] as const : ['#FFF0E7', '#FCE4D9', colors.background] as const;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={filteredRooms}
        keyExtractor={(room) => room.id}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => load(true)} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <LinearGradient colors={gradient} style={styles.hero}>
            <View style={styles.header}><BrandLogo compact /><Text style={styles.headerTitle}>Chats</Text><Pressable onPress={() => router.push('/(tabs)/friends')} style={styles.iconButton}><Ionicons color={colors.text} name="create-outline" size={22} /></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matches}>
              <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.match}><View><Avatar imageUrl={user?.profilePictureUrl} name={user?.fullName || user?.username} size={56} /><View style={styles.addStory}><Ionicons color="#FFFFFF" name="add" size={12} /></View></View><Text style={styles.matchName}>You</Text></Pressable>
              {friends.map((friend) => <Pressable key={friend.id} onPress={() => openFriendProfile(friend)} style={styles.match}><View style={styles.storyRing}><Avatar imageUrl={friend.profilePictureUrl} name={friend.userName} online={friend.isOnline} size={54} /></View><Text numberOfLines={1} style={styles.matchName}>{friend.userName}</Text></Pressable>)}
            </ScrollView>
            <View style={styles.search}><Ionicons color={colors.textMuted} name="search-outline" size={19} /><TextInput onChangeText={setQuery} placeholder="Search chats" placeholderTextColor={colors.textMuted} style={styles.searchInput} value={query} /><Pressable><Ionicons color={colors.textMuted} name="options-outline" size={19} /></Pressable></View>
          </LinearGradient>
          <View style={styles.contentHeader}><Text style={styles.sectionTitle}>Messages</Text><View style={styles.filters}>{([['all', 'All'], ['online', 'Online'], ['groups', 'Groups']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text></Pressable>)}</View></View>
          {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
        </>}
        ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons color={colors.primary} name="chatbubble-ellipses-outline" size={38} /><Text style={styles.emptyTitle}>No conversations here</Text><Text style={styles.muted}>Find a friend and start your first Velo chat.</Text></View> : null}
        renderItem={({ item }) => {
          const person = displayPerson(item); const message = latest[item.id];
          const title = item.isGroupChat ? item.roomName : person?.userName || item.roomName;
          return <Pressable onPress={() => openRoom(item)} style={({ pressed }) => [styles.room, pressed && styles.roomPressed]}><Avatar imageUrl={person?.profilePictureUrl} name={title} online={person?.isOnline} size={52} /><View style={styles.roomText}><View style={styles.roomTop}><Text numberOfLines={1} style={styles.roomName}>{title}</Text><Text style={styles.time}>{relativeTime(message?.timestamp || item.createdAt)}</Text></View><Text numberOfLines={1} style={styles.preview}>{message?.senderId === user?.id ? 'You: ' : ''}{message?.content || 'Tap to open conversation'}</Text></View><Ionicons color={colors.border} name="chevron-forward" size={17} /></Pressable>;
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, list: { backgroundColor: colors.background, paddingBottom: 30 }, hero: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 22 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }, headerTitle: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -0.8 }, iconButton: { alignItems: 'center', backgroundColor: `${colors.surface}CC`, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  matches: { gap: 15, minHeight: 88, paddingHorizontal: 20, paddingVertical: 8 }, match: { alignItems: 'center', gap: 6, width: 60 }, matchName: { color: colors.text, fontSize: 10, maxWidth: 60 }, storyRing: { borderColor: colors.primary, borderRadius: 32, borderWidth: 1.5, padding: 2 }, addStory: { alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.surface, borderRadius: 9, borderWidth: 2, bottom: -1, height: 18, justifyContent: 'center', position: 'absolute', right: -1, width: 18 },
  search: { alignItems: 'center', backgroundColor: `${colors.surface}E8`, borderColor: `${colors.surface}99`, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 10, paddingHorizontal: 15 }, searchInput: { color: colors.text, flex: 1, fontSize: 14, height: 50 },
  contentHeader: { gap: 13, paddingHorizontal: 20, paddingTop: 21 }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' }, filters: { flexDirection: 'row', gap: 8 }, filter: { backgroundColor: colors.surfaceMuted, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }, filterActive: { backgroundColor: colors.primary }, filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, filterTextActive: { color: '#FFFFFF' },
  loader: { padding: 25 }, room: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 10, minHeight: 78, paddingHorizontal: 14, paddingVertical: 11 }, roomPressed: { backgroundColor: colors.primarySoft, transform: [{ scale: 0.99 }] }, roomText: { flex: 1, gap: 6 }, roomTop: { alignItems: 'center', flexDirection: 'row', gap: 10 }, roomName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '800' }, time: { color: colors.textMuted, fontSize: 10 }, preview: { color: colors.textMuted, fontSize: 12 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' }, empty: { alignItems: 'center', gap: 8, padding: 42 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
});
