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
}
