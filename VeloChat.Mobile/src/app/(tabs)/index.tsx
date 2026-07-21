import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, router } from 'expo-router';
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

function relativeTime(value?: string) {
  if (!value) return '';
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChatsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [latest, setLatest] = useState<Record<string, ChatMessage | undefined>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const [roomResponse, friendResponse] = await Promise.all([
        api.get<ChatRoom[]>('/api/chatrooms/my-rooms'),
        api.get<Friend[]>('/api/friendships/list'),
      ]);
      setRooms(roomResponse.data);
      setFriends(friendResponse.data);
      const messages = await Promise.all(roomResponse.data.map(async (room) => {
        try {
          const response = await api.get<ChatMessage[]>(`/api/messages/room/${room.id}`);
          return [room.id, response.data.at(-1)] as const;
        } catch { return [room.id, undefined] as const; }
      }));
      setLatest(Object.fromEntries(messages));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const displayPerson = useCallback((room: ChatRoom): Participant | undefined => room.participants?.find((p) => p.userId !== user?.id) ?? room.participants?.[0], [user?.id]);
  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const person = displayPerson(room);
    const title = room.isGroupChat ? room.roomName : person?.userName || room.roomName;
    return title.toLowerCase().includes(query.trim().toLowerCase());
  }), [displayPerson, query, rooms]);

  const openRoom = (room: ChatRoom) => {
    const person = displayPerson(room);
    router.push({ pathname: '/chat/[id]', params: { id: room.id, name: room.isGroupChat ? room.roomName : person?.userName || room.roomName, avatar: person?.profilePictureUrl || '' } });
  };

  const openFriend = async (friend: Friend) => {
    const response = await api.post<ChatRoom>(`/api/chatrooms/dm/${friend.id}`);
    openRoom(response.data);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}><BrandLogo /><Pressable onPress={() => router.push('/(tabs)/friends')} style={styles.add}><Ionicons color={colors.text} name="create-outline" size={23} /></Pressable></View>
      <FlatList
        data={filteredRooms}
        keyExtractor={(room) => room.id}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => load(true)} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <Text style={styles.eyebrow}>MATCHES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matches}>
            {friends.length ? friends.map((friend) => <Pressable key={friend.id} onPress={() => openFriend(friend)} style={styles.match}><Avatar imageUrl={friend.profilePictureUrl} name={friend.userName} online={friend.isOnline} size={58} /><Text numberOfLines={1} style={styles.matchName}>{friend.userName}</Text></Pressable>) : <Text style={styles.muted}>Accepted friends appear here.</Text>}
          </ScrollView>
          <View style={styles.search}><TextInput onChangeText={setQuery} placeholder="Search conversations" placeholderTextColor={colors.textMuted} style={styles.searchInput} value={query} /><Ionicons color={colors.textMuted} name="search-outline" size={19} /></View>
          <Text style={[styles.eyebrow, styles.chatLabel]}>CHAT</Text>
          {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
        </>}
        ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons color={colors.primary} name="chatbubble-ellipses-outline" size={38} /><Text style={styles.emptyTitle}>No conversations yet</Text><Text style={styles.muted}>Find a friend and start your first Velo chat.</Text></View> : null}
        renderItem={({ item }) => {
          const person = displayPerson(item);
          const message = latest[item.id];
          const title = item.isGroupChat ? item.roomName : person?.userName || item.roomName;
          return <Pressable onPress={() => openRoom(item)} style={({ pressed }) => [styles.room, pressed && styles.roomPressed]}><Avatar imageUrl={person?.profilePictureUrl} name={title} online={person?.isOnline} size={50} /><View style={styles.roomText}><View style={styles.roomTop}><Text numberOfLines={1} style={styles.roomName}>{title}</Text><Text style={styles.time}>{relativeTime(message?.timestamp || item.createdAt)}</Text></View><Text numberOfLines={1} style={styles.preview}>{message?.content || 'Tap to open conversation'}</Text></View></Pressable>;
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  add: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 13, height: 44, justifyContent: 'center', width: 44 },
  list: { paddingBottom: 28 }, eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, paddingHorizontal: 20 },
  matches: { gap: 16, minHeight: 94, paddingHorizontal: 20, paddingVertical: 10 }, match: { alignItems: 'center', gap: 5, width: 62 }, matchName: { color: colors.text, fontSize: 11, maxWidth: 62 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 20 }, search: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 15, flexDirection: 'row', marginHorizontal: 20, marginTop: 8, paddingHorizontal: 15 }, searchInput: { color: colors.text, flex: 1, fontSize: 14, height: 50 },
  chatLabel: { marginBottom: 6, marginTop: 18 }, loader: { padding: 25 }, room: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 20, paddingVertical: 11 }, roomPressed: { backgroundColor: colors.primarySoft }, roomText: { flex: 1, gap: 5 }, roomTop: { alignItems: 'center', flexDirection: 'row', gap: 10 }, roomName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '800' }, time: { color: colors.textMuted, fontSize: 10 }, preview: { color: colors.textMuted, fontSize: 12 },
  empty: { alignItems: 'center', gap: 8, padding: 42 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
});
