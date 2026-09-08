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
    room: (roomId: string) => `/api/messages/room/${roomId}`,
  },
} as const;
