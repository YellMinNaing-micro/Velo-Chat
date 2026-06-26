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
public class ChatRoomsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChatRoomsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateRoom([FromQuery] string? roomName, [FromQuery] bool isGroupChat)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        var room = new ChatRoom
        {
            RoomName = isGroupChat ? roomName : "Direct Message",
            IsGroupChat = isGroupChat,
            CreatedAt = DateTime.UtcNow
        };

        room.RoomParticipants.Add(new RoomParticipant
        {
            UserId = userId,
            JoinedAt = DateTime.UtcNow
        });

        _context.ChatRooms.Add(room);
        await _context.SaveChangesAsync();

        return Ok(room);
    }

    [HttpGet("my-rooms")]
    public async Task<IActionResult> GetMyRooms()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
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
    public async Task<IActionResult> JoinRoom(Guid roomId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
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
            JoinedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok("Joined room successfully.");
    }

    [HttpPost("dm/{friendId}")]
    public async Task<IActionResult> GetOrCreateDirectMessageRoom(string friendId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        // 1. Check if friendship exists and is accepted
        var friendshipExists = await _context.Friendships
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
                RoomName = r.RoomName,
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
        var friendUser = await _context.Users.FindAsync(friendId);
        if (friendUser == null) return NotFound("Friend user not found.");

        var newRoom = new ChatRoom
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
                new { UserId = friendId, UserName = friendUser.UserName, ProfilePictureUrl = friendUser.ProfilePictureUrl, IsOnline = friendUser.IsOnline }
            }
        };

        return Ok(result);
    }
}
