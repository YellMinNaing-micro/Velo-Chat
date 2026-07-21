import Ionicons from '@expo/vector-icons/Ionicons';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import type { ThemeColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { API_BASE_URL, api, getApiError } from '@/services/api';
import { sessionStorage } from '@/services/session-storage';
import type { ChatMessage } from '@/types/api';

export default function ConversationScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Connecting…');
  const [typingName, setTypingName] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const connectionRef = useRef<HubConnection | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/chathub`, { accessTokenFactory: async () => (await sessionStorage.read())?.accessToken || '' })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();
    connectionRef.current = connection;

    connection.on('ReceiveMessage', (message: ChatMessage) => {
      if (message.roomId === params.id) setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message]);
    });
    connection.on('UserTyping', (info: { roomId: string; userId: string; username: string; isTyping: boolean }) => {
      if (info.roomId === params.id && info.userId !== user?.id) setTypingName(info.isTyping ? info.username : '');
    });
    connection.onreconnecting(() => active && setStatus('Reconnecting…'));
    connection.onreconnected(async () => { if (active) { setStatus('Online'); await connection.invoke('JoinRoom', params.id); } });
    connection.onclose(() => active && setStatus('Offline'));

    (async () => {
      try {
        const history = await api.get<ChatMessage[]>(`/api/messages/room/${params.id}`);
        if (active) setMessages(history.data);
        await connection.start();
        await connection.invoke('JoinRoom', params.id);
        if (active) setStatus('Online');
      } catch (err) { if (active) { setStatus('Offline'); setError(getApiError(err, 'Unable to connect to this chat.')); } }
    })();

    return () => {
      active = false;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      connection.stop();
    };
  }, [params.id, user?.id]);

  const changeText = (value: string) => {
    setText(value);
    const connection = connectionRef.current;
    if (!connection) return;
    connection.invoke('SendTyping', params.id, !!value.trim()).catch(() => undefined);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => connection.invoke('SendTyping', params.id, false).catch(() => undefined), 1200);
  };

  const send = async () => {
    const content = text.trim();
    const connection = connectionRef.current;
    if (!content || !connection || status !== 'Online') return;
    setText(''); setError('');
    try {
      await connection.invoke('SendTyping', params.id, false);
      await connection.invoke('SendMessage', params.id, content, 'text', null);
    } catch (err) { setText(content); setError(getApiError(err, 'Message was not sent.')); }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons color={colors.text} name="chevron-back" size={24} /></Pressable>
        <Avatar imageUrl={params.avatar} name={params.name} online={status === 'Online'} size={42} />
        <View style={styles.headerText}><Text numberOfLines={1} style={styles.name}>{params.name || 'Conversation'}</Text><Text style={styles.status}>{typingName ? `${typingName} is typing…` : status}</Text></View>
        <Pressable style={styles.more}><Ionicons color={colors.textMuted} name="ellipsis-horizontal" size={23} /></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0} style={styles.flex}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, index) => item.id || `${item.timestamp}-${index}`}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<View style={styles.empty}><Ionicons color={colors.primary} name="sparkles-outline" size={28} /><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.emptyCopy}>Say hello to {params.name || 'your friend'}.</Text></View>}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return <View style={[styles.messageRow, mine && styles.messageRowMine]}>{!mine && <Avatar name={item.senderName} size={30} />}<View style={styles.messageStack}>{item.messageType === 'image' && item.mediaUrl ? <Image source={{ uri: item.mediaUrl }} style={styles.media} /> : null}{!!item.content && <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}><Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.content}</Text></View>}<Text style={[styles.time, mine && styles.timeMine]}>{new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></View></View>;
          }}
        />
        <View style={styles.composer}><Pressable style={styles.attach}><Ionicons color={colors.primaryDark} name="add" size={25} /></Pressable><TextInput multiline onChangeText={changeText} placeholder="Message…" placeholderTextColor={colors.textMuted} style={styles.input} value={text} /><Pressable disabled={!text.trim() || status !== 'Online'} onPress={send} style={[styles.send, (!text.trim() || status !== 'Online') && styles.sendDisabled]}><Ionicons color="#FFFFFF" name="send" size={18} /></Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 }, flex: { flex: 1 }, header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 68, paddingHorizontal: 12 }, back: { alignItems: 'center', height: 42, justifyContent: 'center', width: 34 }, headerText: { flex: 1, gap: 2 }, name: { color: colors.text, fontSize: 16, fontWeight: '800' }, status: { color: colors.primaryDark, fontSize: 11 }, more: { padding: 8 },
  error: { backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 12, padding: 10, textAlign: 'center' }, messages: { backgroundColor: colors.background, flexGrow: 1, gap: 10, justifyContent: 'flex-end', padding: 16 }, messageRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, maxWidth: '84%' }, messageRowMine: { alignSelf: 'flex-end' }, messageStack: { gap: 4, maxWidth: '100%' }, bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }, bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 }, bubbleOther: { backgroundColor: colors.surfaceMuted, borderBottomLeftRadius: 5 }, messageText: { color: colors.text, fontSize: 15, lineHeight: 21 }, messageTextMine: { color: '#FFFFFF' }, time: { color: colors.textMuted, fontSize: 9, marginLeft: 4 }, timeMine: { alignSelf: 'flex-end', marginRight: 4 }, media: { borderRadius: 16, height: 190, width: 220 },
  empty: { alignItems: 'center', gap: 6, padding: 30 }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, emptyCopy: { color: colors.textMuted, fontSize: 13 }, composer: { alignItems: 'flex-end', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 9, padding: 10, paddingHorizontal: 14 }, attach: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, input: { backgroundColor: colors.surfaceMuted, borderRadius: 20, color: colors.text, flex: 1, fontSize: 15, maxHeight: 110, minHeight: 42, paddingHorizontal: 16, paddingVertical: 10 }, send: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 21, height: 42, justifyContent: 'center', width: 42 }, sendDisabled: { backgroundColor: '#BFC8C6' },
});
