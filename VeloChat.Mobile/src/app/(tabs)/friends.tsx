import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import type { ThemeColors } from '@/constants/colors';
import { useAppTheme } from '@/context/theme-context';
import { api, getApiError } from '@/services/api';
import type { ChatRoom, Friend } from '@/types/api';

type PendingResponse = {
  incoming: { id: string; sender: Friend }[];
  outgoing: { id: string; receiver: Friend }[];
};

export default function FriendsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<PendingResponse['incoming']>([]);
  const [results, setResults] = useState<Friend[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [friendResponse, pendingResponse] = await Promise.all([
        api.get<Friend[]>('/api/friendships/list'),
        api.get<PendingResponse>('/api/friendships/pending'),
      ]);
      setFriends(friendResponse.data);
      setIncoming(pendingResponse.data.incoming || []);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(async () => {
      try { const response = await api.get<Friend[]>('/api/friendships/search', { params: { query: query.trim() } }); setResults(response.data); }
      catch (error) { setMessage(getApiError(error, 'Search failed.')); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const accept = async (friendId: string) => { await api.post(`/api/friendships/accept/${friendId}`); await load(); };
  const add = async (friendId: string) => {
    try { await api.post(`/api/friendships/request/${friendId}`); setResults((items) => items.map((item) => item.id === friendId ? { ...item, friendshipStatus: 'Pending' } : item)); setMessage('Friend request sent.'); }
    catch (error) { setMessage(getApiError(error, 'Unable to send request.')); }
  };
  const chat = async (friend: Friend) => {
    const response = await api.post<ChatRoom>(`/api/chatrooms/dm/${friend.id}`);
    router.push({ pathname: '/chat/[id]', params: { id: response.data.id, name: friend.userName, avatar: friend.profilePictureUrl || '' } });
  };

  const people = query.trim() ? results : friends;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}><View><Text style={styles.title}>People</Text><Text style={styles.subtitle}>Find friends and start a chat</Text></View><Ionicons color={colors.primary} name="people-circle-outline" size={38} /></View>
      <View style={styles.search}><Ionicons color={colors.textMuted} name="search-outline" size={19} /><TextInput onChangeText={setQuery} placeholder="Search username, name or email" placeholderTextColor={colors.textMuted} style={styles.input} value={query} /></View>
      {!!message && <Text style={styles.notice}>{message}</Text>}
      {!!incoming.length && !query && <View style={styles.requests}><Text style={styles.section}>REQUESTS</Text>{incoming.map(({ id, sender }) => <View key={id} style={styles.person}><Avatar imageUrl={sender.profilePictureUrl} name={sender.userName} size={46} /><View style={styles.personText}><Text style={styles.name}>{sender.userName}</Text><Text style={styles.meta}>Wants to be friends</Text></View><Pressable onPress={() => accept(sender.id)} style={styles.action}><Text style={styles.actionText}>Accept</Text></Pressable></View>)}</View>}
      <Text style={styles.section}>{query ? 'SEARCH RESULTS' : 'FRIENDS'}</Text>
      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{query ? 'No people found' : 'No friends yet'}</Text><Text style={styles.meta}>{query ? 'Try another search.' : 'Search above to grow your circle.'}</Text></View>}
        renderItem={({ item }) => <View style={styles.person}><Avatar imageUrl={item.profilePictureUrl} name={item.fullName || item.userName} online={item.isOnline} size={50} /><View style={styles.personText}><Text style={styles.name}>{item.fullName || item.userName}</Text><Text style={styles.meta}>@{item.userName}</Text></View>{query ? (item.friendshipStatus === 'Accepted' ? <Pressable onPress={() => chat(item)} style={styles.secondary}><Text style={styles.secondaryText}>Chat</Text></Pressable> : item.friendshipStatus === 'Pending' ? <Text style={styles.pending}>Pending</Text> : <Pressable onPress={() => add(item.id)} style={styles.action}><Text style={styles.actionText}>Add</Text></Pressable>) : <Pressable onPress={() => chat(item)} style={styles.circle}><Ionicons color={colors.primaryDark} name="chatbubble-outline" size={19} /></Pressable>}</View>}
      />}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 }, title: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1 }, subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  search: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 15, flexDirection: 'row', gap: 9, margin: 20, paddingHorizontal: 14 }, input: { color: colors.text, flex: 1, height: 50 }, notice: { color: colors.primaryDark, fontSize: 12, marginBottom: 10, paddingHorizontal: 20 }, requests: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 14 }, section: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.9, marginBottom: 6, paddingHorizontal: 20 },
  list: { paddingBottom: 24 }, person: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 70, paddingHorizontal: 20, paddingVertical: 9 }, personText: { flex: 1, gap: 3 }, name: { color: colors.text, fontSize: 15, fontWeight: '800' }, meta: { color: colors.textMuted, fontSize: 12 }, action: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9 }, actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, secondary: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9 }, secondaryText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' }, pending: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, circle: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, loader: { padding: 32 }, empty: { alignItems: 'center', gap: 5, padding: 42 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
});
