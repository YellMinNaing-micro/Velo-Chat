export type TokenPair = { accessToken: string; refreshToken: string };

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  profilePictureUrl?: string | null;
};

export type Participant = {
  userId: string;
  userName: string;
  profilePictureUrl?: string | null;
  isOnline: boolean;
};

export type ChatRoom = {
  id: string;
  roomName: string;
  isGroupChat: boolean;
  createdAt: string;
  participants: Participant[];
};

export type Friend = {
  id: string;
  userName: string;
  fullName?: string | null;
  profilePictureUrl?: string | null;
  isOnline?: boolean;
  friendshipStatus?: 'None' | 'Pending' | 'Accepted';
};

export type FriendProfile = Friend & {
  friendsSince: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  messageType: 'text' | 'image' | 'file' | 'voice';
  content: string;
  mediaUrl?: string | null;
  timestamp: string;
  isEdited: boolean;
  isDeleted: boolean;
};
