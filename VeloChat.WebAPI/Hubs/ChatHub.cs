using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using VeloChat.WebAPI.Data;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMongoCollection<Message> _messageCollection;
    private readonly AppDbContext _dbContext;

    public ChatHub(IMongoDatabase mongoDatabase, AppDbContext dbContext)
    {
        _messageCollection = mongoDatabase.GetCollection<Message>("Messages");
        _dbContext = dbContext;
    }

    private async Task EnsureRoomMember(string roomId)
    {
        if (!Guid.TryParse(roomId, out var parsedRoomId) ||
            string.IsNullOrEmpty(Context.UserIdentifier) ||
            !await _dbContext.RoomParticipants.AnyAsync(p =>
                p.RoomId == parsedRoomId && p.UserId == Context.UserIdentifier))
        {
            throw new HubException("You are not a member of this room.");
        }
    }

    public async Task JoinRoom(string roomId)
    {
        await EnsureRoomMember(roomId);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserJoined", Context.UserIdentifier);
    }

    public async Task LeaveRoom(string roomId)
    {
        await EnsureRoomMember(roomId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserLeft", Context.UserIdentifier);
    }

    public async Task SendMessage(string roomId, string content, string messageType, string? mediaUrl)
    {
        await EnsureRoomMember(roomId);
        if (string.IsNullOrWhiteSpace(content) && string.IsNullOrWhiteSpace(mediaUrl))
            throw new HubException("A message cannot be empty.");
        if (content?.Length > 4000)
            throw new HubException("Message is too long.");

        string? senderId = Context.UserIdentifier;
        string senderName = Context.User?.Identity?.Name ?? "Unknown";

        Message message = new Message
        {
            RoomId = roomId,
            SenderId = senderId!,
            SenderName = senderName,
            MessageType = messageType,
            Content = content ?? string.Empty,
            MediaUrl = mediaUrl,
            Timestamp = DateTime.UtcNow,
            IsEdited = false,
            IsDeleted = false,
            ReadBy = new List<ReadReceipt>()
        };

        // Save message to MongoDB
        await _messageCollection.InsertOneAsync(message);

        // Broadcast message to everyone in the room
        await Clients.Group(roomId).SendAsync("ReceiveMessage", message);
    }

    public async Task SendTyping(string roomId, bool isTyping)
    {
        await EnsureRoomMember(roomId);
        string? senderId = Context.UserIdentifier;
        string? senderName = Context.User?.Identity?.Name ?? "Unknown";
        await Clients.Group(roomId).SendAsync("UserTyping", new { roomId, userId = senderId, username = senderName, isTyping });
    }
}
