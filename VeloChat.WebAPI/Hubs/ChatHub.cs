using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMongoCollection<Message> _messageCollection;

    public ChatHub(IMongoDatabase mongoDatabase)
    {
        _messageCollection = mongoDatabase.GetCollection<Message>("Messages");
    }

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserJoined", Context.UserIdentifier);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserLeft", Context.UserIdentifier);
    }

    public async Task SendMessage(string roomId, string content, string messageType, string? mediaUrl)
    {
        var senderId = Context.UserIdentifier;
        var senderName = Context.User?.Identity?.Name ?? "Unknown";

        var message = new Message
        {
            RoomId = roomId,
            SenderId = senderId ?? "Unknown",
            SenderName = senderName,
            MessageType = messageType,
            Content = content,
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
        var senderId = Context.UserIdentifier;
        var senderName = Context.User?.Identity?.Name ?? "Unknown";
        await Clients.Group(roomId).SendAsync("UserTyping", new { roomId, userId = senderId, username = senderName, isTyping });
    }
}
