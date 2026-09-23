using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using VeloChat.WebAPI.Data;
using VeloChat.WebAPI.Hubs;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[Tags("Chat Rooms")]
public class ChatRoomsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IMongoCollection<Message> _messages;
    private readonly IHubContext<ChatHub> _hub;

    public ChatRoomsController(AppDbContext context, IMongoDatabase mongoDatabase, IHubContext<ChatHub> hub)
    {
        _context = context;
        _messages = mongoDatabase.GetCollection<Message>("Messages");
        _hub = hub;
    }

    [HttpPost("create")]
    [EndpointSummary("Create a chat room")]
    [EndpointDescription("Creates a group room. Use the dm/{friendId} endpoint for direct messages.")]
    public async Task<IActionResult> CreateRoom([FromQuery] string? roomName, [FromQuery] bool isGroupChat)
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");
        if (!isGroupChat) return BadRequest("Use the direct-message endpoint to start a private chat.");
        if (string.IsNullOrWhiteSpace(roomName)) return BadRequest("Group name is required.");

        ChatRoom room = new ChatRoom
        {
            RoomName = roomName.Trim(),
            IsGroupChat = true,
            CreatedAt = DateTime.UtcNow
        };

        room.RoomParticipants.Add(new RoomParticipant
        {
            UserId = userId,
            JoinedAt = DateTime.UtcNow
        });

        _context.ChatRooms.Add(room);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            room.Id, room.RoomName, room.IsGroupChat, room.CreatedAt,
            Participants = new[]
            {
                new
                {
                    UserId = userId,
                    UserName = User.Identity?.Name,
                    ProfilePictureUrl = (string?)null,
                    IsOnline = true
                }
            },
            UnreadCount = 0
        });
    }

    [HttpGet("my-rooms")]
    [EndpointSummary("List the current user's chat rooms")]
    [EndpointDescription("Returns every chat room joined by the authenticated user, including participant profile and online-status details.")]
    public async Task<IActionResult> GetMyRooms()
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        var rooms = await _context.RoomParticipants
            .Where(rp => rp.UserId == userId)
            .Select(rp => new
            {
                rp.LastReadAt,
                rp.JoinedAt,
                rp.ChatRoom.Id,
                rp.ChatRoom.RoomName,
                rp.ChatRoom.IsGroupChat,
                rp.ChatRoom.CreatedAt,
                Participants = rp.ChatRoom.RoomParticipants.Select(p => new
                {
                    p.UserId,
                    p.User.UserName,
                    p.User.ProfilePictureUrl,
                    p.User.IsOnline
                })
            })
            .ToListAsync();

        var result = new List<object>();
        foreach (var room in rooms)
        {
            var since = room.LastReadAt.HasValue
                ? DateTime.SpecifyKind(room.LastReadAt.Value, DateTimeKind.Utc)
                : DateTime.MinValue;
            var unreadCount = await _messages.CountDocumentsAsync(m =>
                m.RoomId == room.Id.ToString() && m.SenderId != userId && m.Timestamp > since);
            result.Add(new
            {
                room.Id, room.RoomName, room.IsGroupChat, room.CreatedAt,
                room.Participants, UnreadCount = unreadCount
            });
        }

        return Ok(result);
    }

    [HttpPost("{roomId}/read")]
    [EndpointSummary("Mark a room as read")]
    public async Task<IActionResult> MarkRead(Guid roomId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var participant = await _context.RoomParticipants.FindAsync(roomId, userId);
        if (participant == null) return NotFound("Room membership not found.");
        participant.LastReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{roomId}/members/{friendId}")]
    [EndpointSummary("Add an accepted friend to a group room")]
    public async Task<IActionResult> AddGroupMember(Guid roomId, string friendId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var room = await _context.ChatRooms.Include(r => r.RoomParticipants)
            .FirstOrDefaultAsync(r => r.Id == roomId);
        if (room == null) return NotFound("Room not found.");
        if (!room.IsGroupChat) return BadRequest("Only group rooms can have members added.");
        if (!room.RoomParticipants.Any(p => p.UserId == userId)) return Forbid();
        if (room.RoomParticipants.Any(p => p.UserId == friendId)) return Conflict("User is already a member.");
        var isFriend = await _context.Friendships.AnyAsync(f =>
            ((f.UserId == userId && f.FriendId == friendId) ||
             (f.UserId == friendId && f.FriendId == userId)) && f.Status == "Accepted");
        if (!isFriend) return BadRequest("Only accepted friends can be added.");

        room.RoomParticipants.Add(new RoomParticipant
        {
            UserId = friendId, JoinedAt = DateTime.UtcNow, LastReadAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        await _hub.Clients.User(friendId).SendAsync("RoomAdded", roomId);
        return NoContent();
    }

    [HttpPost("{roomId}/join")]
    [EndpointSummary("Join a chat room")]
    [EndpointDescription("Checks existing membership. Joining another user's room requires an invitation flow and is not supported yet.")]
    public async Task<IActionResult> JoinRoom(Guid roomId)
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        var room = await _context.ChatRooms
            .Include(cr => cr.RoomParticipants)
            .FirstOrDefaultAsync(cr => cr.Id == roomId);

        if (room == null) return NotFound("Room not found.");

        if (room.RoomParticipants.Any(rp => rp.UserId == userId))
            return Ok("Already a member of this room.");

        return Forbid();
    }

    [HttpPost("dm/{friendId}")]
    [EndpointSummary("Open a direct-message room")]
    [EndpointDescription("Returns the existing direct-message room with an accepted friend, or creates one when no room exists.")]
    public async Task<IActionResult> GetOrCreateDirectMessageRoom(string friendId)
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        // 1. Check if friendship exists and is accepted
        bool friendshipExists = await _context.Friendships
            .AnyAsync(f => ((f.UserId == userId && f.FriendId == friendId) || 
                            (f.UserId == friendId && f.FriendId == userId)) && 
                           f.Status == "Accepted");

        if (!friendshipExists)
        {
            return BadRequest("You can only start direct chats with accepted friends.");
        }

        // 2. Check if a DM room already exists between these two users
        var existingRoom = await _context.ChatRooms
            .Where(r => !r.IsGroupChat)
            .Where(r => r.RoomParticipants.Any(p => p.UserId == userId) && 
                        r.RoomParticipants.Any(p => p.UserId == friendId))
            .Select(r => new
            {
                r.Id,
                r.RoomName,
                r.IsGroupChat,
                r.CreatedAt,
                Participants = r.RoomParticipants.Select(p => new
                {
                    p.UserId,
                    p.User.UserName,
                    p.User.ProfilePictureUrl,
                    p.User.IsOnline
                })
            })
            .FirstOrDefaultAsync();

        if (existingRoom != null)
        {
            return Ok(existingRoom);
        }

        // 3. Create a new DM room
        ApplicationUser? friendUser = await _context.Users.FindAsync(friendId);
        if (friendUser == null) return NotFound("Friend user not found.");

        ChatRoom newRoom = new ChatRoom
        {
            RoomName = $"{User.Identity?.Name} & {friendUser.UserName}",
            IsGroupChat = false,
            CreatedAt = DateTime.UtcNow
        };

        // Add both participants
        newRoom.RoomParticipants.Add(new RoomParticipant { UserId = userId, JoinedAt = DateTime.UtcNow });
        newRoom.RoomParticipants.Add(new RoomParticipant { UserId = friendId, JoinedAt = DateTime.UtcNow });

        _context.ChatRooms.Add(newRoom);
        await _context.SaveChangesAsync();

        var result = new
        {
            newRoom.Id,
            newRoom.RoomName,
            newRoom.IsGroupChat,
            newRoom.CreatedAt,
            Participants = new[]
            {
                new { UserId = userId, UserName = User.Identity?.Name, ProfilePictureUrl = (string?)null, IsOnline = true },
                new { UserId = friendId, friendUser.UserName, friendUser.ProfilePictureUrl, friendUser.IsOnline }
            }
        };

        return Ok(result);
    }
}
