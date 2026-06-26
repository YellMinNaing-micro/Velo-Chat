import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL } from '../services/api';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { 
  LogOut, Plus, Users, Send, MessageSquare, Image, UserPlus, 
  Smile, UserCheck, AlertCircle, Circle
} from 'lucide-react';

const Chat = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isGroupChat, setIsGroupChat] = useState(false);

  // Friend System states
  const [friends, setFriends] = useState([]);
  const [friendEmailOrId, setFriendEmailOrId] = useState('');
  const [friendError, setFriendError] = useState('');
  const [friendSuccess, setFriendSuccess] = useState('');
  const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });

  // Friend Search states
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Typing indicator states
  const [typingUsers, setTypingUsers] = useState({}); // { roomId: { username: boolean } }

  const hubConnectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeRoomRef = useRef(null);
  const prevRoomIdRef = useRef(null);

  // Keep activeRoomRef updated to prevent stale closures
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // 1. Fetch Rooms & Friends
  const fetchData = async () => {
    try {
      const roomsResponse = await api.get('/api/chatrooms/my-rooms');
      setRooms(roomsResponse.data);

      const friendsResponse = await api.get('/api/friendships/list');
      setFriends(friendsResponse.data);

      const pendingResponse = await api.get('/api/friendships/pending');
      setPendingRequests(pendingResponse.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleAcceptFriendRequest = async (senderId) => {
    try {
      await api.post(`/api/friendships/accept/${senderId}`);
      await fetchData();
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. Establish SignalR Hub Connection (Once on mount)
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/chathub`, {
        accessTokenFactory: () => accessToken
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveMessage', (message) => {
      // If message belongs to active room, append to state
      if (activeRoomRef.current && message.roomId === activeRoomRef.current.id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    connection.on('UserTyping', (typingInfo) => {
      const { roomId, username, isTyping } = typingInfo;
      setTypingUsers((prev) => ({
        ...prev,
        [roomId]: {
          ...(prev[roomId] || {}),
          [username]: isTyping
        }
      }));
    });

    connection.start()
      .then(() => {
        console.log('Connected to SignalR Hub successfully!');
        hubConnectionRef.current = connection;
        
        // If there's an active room already on connect, join it
        if (activeRoomRef.current) {
          connection.invoke('JoinRoom', activeRoomRef.current.id)
            .then(() => {
              prevRoomIdRef.current = activeRoomRef.current.id;
            })
            .catch(err => console.warn('Failed to join room group on connect:', err));
        }
      })
      .catch((err) => console.error('SignalR Hub Connection Error:', err));

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  // 3. Handle Active Room Switching in SignalR Hub Group
  useEffect(() => {
    if (!hubConnectionRef.current || hubConnectionRef.current.state !== 'Connected') return;

    const switchHubGroups = async () => {
      try {
        if (prevRoomIdRef.current) {
          await hubConnectionRef.current.invoke('LeaveRoom', prevRoomIdRef.current);
        }
        if (activeRoom?.id) {
          await hubConnectionRef.current.invoke('JoinRoom', activeRoom.id);
          prevRoomIdRef.current = activeRoom.id;
        }
      } catch (err) {
        console.warn('Error switching hub groups:', err);
      }
    };

    switchHubGroups();
  }, [activeRoom?.id]);

  const handleRoomSelect = async (room) => {
    setActiveRoom(room);
    setMessages([]);

    try {
      // Load historical messages from MongoDB
      const response = await api.get(`/api/messages/room/${room.id}`);
      setMessages(response.data);
    } catch (err) {
      console.error('Error switching room:', err);
    }
  };

  const handleStartDirectChat = async (friendId) => {
    try {
      const response = await api.post(`/api/chatrooms/dm/${friendId}`);
      const room = response.data;
      
      // Add to rooms list if it doesn't exist
      if (!rooms.some(r => r.id === room.id)) {
        setRooms(prev => [...prev, room]);
      }
      
      handleRoomSelect(room);
    } catch (err) {
      console.error('Failed to start direct chat:', err);
    }
  };

  // 4. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !mediaUrl.trim()) || !activeRoom || isSending) return;

    setIsSending(true);
    try {
      if (hubConnectionRef.current) {
        const type = mediaUrl ? 'image' : 'text';
        // Send via SignalR (saves to MongoDb and broadcasts in real-time)
        await hubConnectionRef.current.invoke(
          'SendMessage', 
          activeRoom.id, 
          inputText, 
          type, 
          mediaUrl || null
        );
        setInputText('');
        setMediaUrl('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // 5. Send Typing Indicator
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (activeRoom && hubConnectionRef.current) {
      hubConnectionRef.current.invoke('SendTyping', activeRoom.id, e.target.value.length > 0)
        .catch(err => console.warn(err));
    }
  };

  // 6. Create Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const response = await api.post(
        `/api/chatrooms/create?roomName=${encodeURIComponent(newRoomName)}&isGroupChat=${isGroupChat}`
      );
      setRooms((prev) => [...prev, response.data]);
      setNewRoomName('');
      setShowCreateRoom(false);
      handleRoomSelect(response.data);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  // 7. Add Friend Request
  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    setFriendError('');
    setFriendSuccess('');

    try {
      // Find user by username or email on the backend
      // (This assumes we can pass a userId or query)
      await api.post(`/api/friendships/request/${friendEmailOrId}`);
      setFriendSuccess('Friend request sent successfully!');
      setFriendEmailOrId('');
      fetchData();
    } catch (err) {
      setFriendError(typeof err === 'string' ? err : 'Failed to send request. Check user ID.');
    }
  };

  // Handle Search Input Change
  const handleSearchChange = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setFriendError('');
    setFriendSuccess('');

    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(`/api/friendships/search?query=${encodeURIComponent(q)}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add friend by user ID (from search result)
  const handleAddFriendById = async (userId) => {
    setFriendError('');
    setFriendSuccess('');
    try {
      await api.post(`/api/friendships/request/${userId}`);
      setFriendSuccess('Friend request sent!');
      // Update the search results to show pending status
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendshipStatus: 'Pending' } : u));
      fetchData();
    } catch (err) {
      setFriendError(typeof err?.response?.data === 'string' ? err.response.data : 'Failed to send friend request.');
    }
  };

  const renderFriendAction = (targetUser) => {
    if (targetUser.friendshipStatus === 'Accepted') {
      return (
        <button
          onClick={() => handleStartDirectChat(targetUser.id)}
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: 'none',
            color: 'var(--success)',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Chat
        </button>
      );
    }
    if (targetUser.friendshipStatus === 'Pending') {
      return (
        <span style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          fontWeight: '500',
          padding: '4px 8px'
        }}>
          Pending
        </span>
      );
    }
    return (
      <button
        onClick={() => handleAddFriendById(targetUser.id)}
        style={{
          background: 'var(--accent-primary)',
          border: 'none',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Add
      </button>
    );
  };

  return (
    <div className="glass-panel animate-fade-in-up" style={{
      width: '95vw',
      maxWidth: '1280px',
      height: '85vh',
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      overflow: 'hidden'
    }}>
      {/* Sidebar (Left) */}
      <div style={{
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-sidebar)'
      }}>
        {/* User Profile Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              color: 'white',
              fontSize: '18px',
              border: '2px solid rgba(255, 255, 255, 0.4)'
            }}>
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>{user?.username}</div>
              <div style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Circle size={8} fill="currentColor" /> Active Now
              </div>
            </div>
          </div>

          <button 
            onClick={logout} 
            title="Log Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '16px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => {
              setShowCreateRoom(!showCreateRoom);
              setShowAddFriend(false);
            }} 
            className="btn-premium" 
            style={{ flex: 1, padding: '10px', fontSize: '14px', borderRadius: '8px' }}
          >
            <Plus size={16} /> New Chat
          </button>
          <button 
            onClick={() => {
              setShowAddFriend(!showAddFriend);
              setShowCreateRoom(false);
            }} 
            className="btn-premium" 
            style={{ 
              flex: 1, 
              padding: '10px', 
              fontSize: '14px', 
              borderRadius: '8px',
              background: showAddFriend ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-panel)',
              color: showAddFriend ? 'var(--accent-primary)' : 'var(--text-primary)',
              border: showAddFriend ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
              boxShadow: 'none'
            }}
          >
            <UserPlus size={16} /> Add Friend
          </button>
        </div>

        {/* Create Room Form (collapsible) */}
        {showCreateRoom && (
          <form onSubmit={handleCreateRoom} style={{
            padding: '16px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <input 
              type="text" 
              placeholder="Chat name..." 
              className="glass-input"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              required
              style={{ padding: '8px 12px', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <input 
                type="checkbox" 
                id="isGroup" 
                checked={isGroupChat}
                onChange={(e) => setIsGroupChat(e.target.checked)}
              />
              <label htmlFor="isGroup" style={{ color: 'var(--text-secondary)' }}>Is Group Chat?</label>
            </div>
            <button type="submit" className="btn-premium" style={{ padding: '8px', fontSize: '13px' }}>
              Create Chat Room
            </button>
          </form>
        )}

        {/* Add Friend Form (collapsible) */}
        {showAddFriend && (
          <div style={{
            padding: '16px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Search by Username or Name
              </label>
              <input 
                type="text" 
                placeholder="Type name to search..." 
                className="glass-input"
                value={searchQuery}
                onChange={handleSearchChange}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
            </div>
            
            {/* Search Results list */}
            {searchQuery.trim() && (
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '4px 0'
              }}>
                {searchLoading ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                    No users found.
                  </div>
                ) : (
                  searchResults.map((u) => (
                    <div key={u.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a78bfa 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '12px',
                          flexShrink: 0
                        }}>
                          {u.userName.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.userName}
                          </div>
                          {u.fullName && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {u.fullName}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {renderFriendAction(u)}
                    </div>
                  ))
                )}
              </div>
            )}
            
            {friendSuccess && <div style={{ fontSize: '11px', color: 'var(--success)' }}>{friendSuccess}</div>}
            {friendError && <div style={{ fontSize: '11px', color: 'var(--danger)' }}>{friendError}</div>}
          </div>
        )}

        {/* Sidebar Nav Tabs / Scrollable Lists */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Rooms Header */}
          <div style={{
            padding: '12px 20px 4px 20px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            letterSpacing: '0.5px'
          }}>
            Chats
          </div>

          {/* Rooms List */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {rooms.length === 0 ? (
              <div style={{ padding: '16px 12px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No active chats. Start one!
              </div>
            ) : (
              rooms.map((room) => {
                const isActive = activeRoom?.id === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      border: isActive ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { if(!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                    onMouseLeave={(e) => { if(!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'
                    }}>
                      <MessageSquare size={18} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: isActive ? '600' : '500',
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {room.roomName || 'Direct Chat'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {room.isGroupChat ? 'Group' : 'Private'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Friends Header */}
          <div style={{
            padding: '16px 20px 4px 20px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            letterSpacing: '0.5px'
          }}>
            Friends
          </div>

          {/* Friends List */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {friends.length === 0 ? (
              <div style={{ padding: '16px 12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No friends yet. Add one below!
              </div>
            ) : (
              friends.map((friend) => (
                <div 
                  key={friend.id} 
                  onClick={() => handleStartDirectChat(friend.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: friend.isOnline ? 'var(--success)' : 'var(--text-muted)'
                  }} />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{friend.userName}</span>
                </div>
              ))
            )}
          </div>

          {/* Pending Requests List */}
          {pendingRequests.incoming && pendingRequests.incoming.length > 0 && (
            <>
              <div style={{
                padding: '16px 20px 4px 20px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                color: 'var(--accent-primary)',
                letterSpacing: '0.5px'
              }}>
                Pending Requests
              </div>
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pendingRequests.incoming.map((req) => (
                  <div key={req.id} style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{req.sender.userName}</span>
                    <button
                      onClick={() => handleAcceptFriendRequest(req.sender.id)}
                      className="btn-premium"
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        boxShadow: 'none'
                      }}
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{
            padding: '12px 16px',
            marginTop: 'auto',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(0, 0, 0, 0.01)',
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            VeloChat v1.0.0
          </div>

        </div>
      </div>

      {/* Chat Area (Right) */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {activeRoom ? (
          <>
            {/* Chat Room Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>{activeRoom.roomName}</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> {activeRoom.participants?.length || 1} participant(s)
                </div>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'var(--bg-chat-stream)'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  margin: 'auto',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MessageSquare size={32} />
                  <span>No messages in this chat yet. Say hi!</span>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwnMessage = msg.senderId === user.id;
                  return (
                    <div
                      key={msg.id || index}
                      className="animate-slide-in-right"
                      style={{
                        alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        gap: '4px'
                      }}
                    >
                      {/* Sender Name */}
                      {!isOwnMessage && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          {msg.senderName}
                        </span>
                      )}

                      {/* Message Bubble */}
                      <div style={{
                        padding: '12px 18px',
                        borderRadius: '16px',
                        borderTopRightRadius: isOwnMessage ? '2px' : '16px',
                        borderTopLeftRadius: isOwnMessage ? '16px' : '2px',
                        background: isOwnMessage 
                          ? 'var(--bubble-own)' 
                          : 'var(--bubble-other)',
                        border: isOwnMessage ? 'none' : '1px solid var(--border-light)',
                        color: isOwnMessage ? 'white' : 'var(--text-primary)',
                        fontSize: '15px',
                        wordBreak: 'break-word',
                        boxShadow: isOwnMessage ? '0 4px 12px var(--accent-glow)' : 'none'
                      }}>
                        {msg.content}

                        {/* Media display */}
                        {msg.mediaUrl && (
                          <div style={{ marginTop: '8px' }}>
                            <img 
                              src={msg.mediaUrl} 
                              alt="Uploaded attachment" 
                              style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px' }} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginRight: '4px', marginLeft: '4px' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            {activeRoom && typingUsers[activeRoom.id] && Object.keys(typingUsers[activeRoom.id]).some(username => typingUsers[activeRoom.id][username] && username !== user.username) && (
              <div style={{
                padding: '4px 24px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.15)'
              }}>
                <div className="typing-dots" style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                </div>
                <span>
                  {Object.keys(typingUsers[activeRoom.id])
                    .filter(username => typingUsers[activeRoom.id][username] && username !== user.username)
                    .join(', ')}{' '}
                  typing...
                </span>
              </div>
            )}

            {/* Input Panel */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              background: '#ffffff'
            }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="glass-input"
                    value={inputText}
                    onChange={handleInputChange}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn-premium" disabled={isSending}>
                    <Send size={18} />
                  </button>
                </div>

                {/* Media Link Row (Optional Attachment) */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Image size={16} style={{ color: 'var(--text-secondary)' }} />
                  <input
                    type="url"
                    placeholder="Attach image URL..."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      outline: 'none',
                      flex: 1
                    }}
                  />
                </div>
              </form>
            </div>
          </>
        ) : (
          /* Empty Chat Area Landing */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <MessageSquare size={36} />
            </div>
             <div style={{ textAlign: 'center' }}>
               <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>No Active Conversation</h3>
               <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Select a conversation from the sidebar or start a new chat room!</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
