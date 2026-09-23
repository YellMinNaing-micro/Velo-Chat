export const API_ROUTES = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    refresh: '/api/auth/refresh',
    revoke: '/api/auth/revoke',
    me: '/api/auth/me',
    changePassword: '/api/auth/change-password',
  },
  chatRooms: {
    mine: '/api/chatrooms/my-rooms',
    directMessage: (userId: string) => `/api/chatrooms/dm/${userId}`,
    create: '/api/chatrooms/create',
    addMember: (roomId: string, friendId: string) => `/api/chatrooms/${roomId}/members/${friendId}`,
    markRead: (roomId: string) => `/api/chatrooms/${roomId}/read`,
  },
  friendships: {
    list: '/api/friendships/list',
    pending: '/api/friendships/pending',
    search: '/api/friendships/search',
    accept: (userId: string) => `/api/friendships/accept/${userId}`,
    request: (userId: string) => `/api/friendships/request/${userId}`,
    profile: (userId: string) => `/api/friendships/profile/${userId}`,
  },
  messages: {
    room: (roomId: string, before?: string, limit = 50) =>
      `/api/messages/room/${roomId}?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`,
  },
} as const;
