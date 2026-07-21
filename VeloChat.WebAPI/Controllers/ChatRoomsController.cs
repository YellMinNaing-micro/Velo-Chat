using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VeloChat.WebAPI.Data;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[Tags("Chat Rooms")]
public class ChatRoomsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChatRoomsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("create")]
    [EndpointSummary("Create a chat room")]
    [EndpointDescription("Creates a group or direct-message chat room and adds the authenticated user as its first participant.")]
    public async Task<IActionResult> CreateRoom([FromQuery] string? roomName, [FromQuery] bool isGroupChat)
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        ChatRoom room = new ChatRoom
        {
            RoomName = isGroupChat ? roomName : "Direct Message",
            IsGroupChat = isGroupChat,
            CreatedAt = DateTime.Now
        };

        room.RoomParticipants.Add(new RoomParticipant
        {
            UserId = userId,
            JoinedAt = DateTime.Now
        });

        _context.ChatRooms.Add(room);
        await _context.SaveChangesAsync();

        return Ok(room);
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
            .Select(rp => rp.ChatRoom)
            .Select(cr => new
            {
                cr.Id,
                cr.RoomName,
                cr.IsGroupChat,
                cr.CreatedAt,
                Participants = cr.RoomParticipants.Select(p => new
                {
                    p.UserId,
                    p.User.UserName,
                    p.User.ProfilePictureUrl,
                    p.User.IsOnline
                })
            })
            .ToListAsync();

        return Ok(rooms);
    }

    [HttpPost("{roomId}/join")]
    [EndpointSummary("Join a chat room")]
    [EndpointDescription("Adds the authenticated user to the specified chat room when they are not already a participant.")]
    public async Task<IActionResult> JoinRoom(Guid roomId)
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        var room = await _context.ChatRooms
            .Include(cr => cr.RoomParticipants)
            .FirstOrDefaultAsync(cr => cr.Id == roomId);

        if (room == null) return NotFound("Room not found.");

        if (room.RoomParticipants.Any(rp => rp.UserId == userId))
            return BadRequest("User already in room.");

        room.RoomParticipants.Add(new RoomParticipant
        {
            UserId = userId,
            JoinedAt = DateTime.Now
        });

        await _context.SaveChangesAsync();
        return Ok("Joined room successfully.");
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
            CreatedAt = DateTime.Now
        };

        // Add both participants
        newRoom.RoomParticipants.Add(new RoomParticipant { UserId = userId, JoinedAt = DateTime.Now });
        newRoom.RoomParticipants.Add(new RoomParticipant { UserId = friendId, JoinedAt = DateTime.Now });

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
