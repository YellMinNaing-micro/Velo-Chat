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
public class FriendshipsController : ControllerBase
{
    private readonly AppDbContext _context;

    public FriendshipsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("request/{friendId}")]
    public async Task<IActionResult> SendFriendRequest(string friendId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        if (userId == friendId) return BadRequest("You cannot add yourself as a friend.");

        var friendExists = await _context.Users.AnyAsync(u => u.Id == friendId);
        if (!friendExists) return NotFound("User not found.");

        var existingFriendship = await _context.Friendships
            .FirstOrDefaultAsync(f => (f.UserId == userId && f.FriendId == friendId) || 
                                      (f.UserId == friendId && f.FriendId == userId));

        if (existingFriendship != null)
        {
            return BadRequest($"Friendship already exists. Status: {existingFriendship.Status}");
        }

        var friendship = new Friendship
        {
            UserId = userId,
            FriendId = friendId,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.Friendships.Add(friendship);
        await _context.SaveChangesAsync();

        return Ok("Friend request sent.");
    }

    [HttpPost("accept/{friendId}")]
    public async Task<IActionResult> AcceptFriendRequest(string friendId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f => f.UserId == friendId && f.FriendId == userId && f.Status == "Pending");

        if (friendship == null)
        {
            return NotFound("Pending friend request not found.");
        }

        friendship.Status = "Accepted";
        await _context.SaveChangesAsync();

        return Ok("Friend request accepted.");
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetFriends()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        var friends = await _context.Friendships
            .Where(f => (f.UserId == userId || f.FriendId == userId) && f.Status == "Accepted")
            .Select(f => f.UserId == userId ? f.Friend : f.User)
            .Select(u => new
            {
                u.Id,
                u.UserName,
                u.ProfilePictureUrl,
                u.IsOnline
            })
            .ToListAsync();

        return Ok(friends);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingRequests()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        var incoming = await _context.Friendships
            .Where(f => f.FriendId == userId && f.Status == "Pending")
            .Select(f => new
            {
                f.Id,
                f.CreatedAt,
                Sender = new
                {
                    f.User.Id,
                    f.User.UserName,
                    f.User.ProfilePictureUrl
                }
            })
            .ToListAsync();

        var outgoing = await _context.Friendships
            .Where(f => f.UserId == userId && f.Status == "Pending")
            .Select(f => new
            {
                f.Id,
                f.CreatedAt,
                Receiver = new
                {
                    f.Friend.Id,
                    f.Friend.UserName,
                    f.Friend.ProfilePictureUrl
                }
            })
            .ToListAsync();

        return Ok(new { Incoming = incoming, Outgoing = outgoing });
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string query)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return BadRequest("Invalid user.");

        if (string.IsNullOrWhiteSpace(query)) return Ok(new System.Collections.Generic.List<object>());

        var users = await _context.Users
            .Where(u => u.Id != userId)
            .Where(u => u.UserName.Contains(query) || u.Email.Contains(query))
            .Select(u => new
            {
                u.Id,
                u.UserName,
                u.ProfilePictureUrl,
                FriendshipStatus = _context.Friendships
                    .Where(f => (f.UserId == userId && f.FriendId == u.Id) || 
                                (f.UserId == u.Id && f.FriendId == userId))
                    .Select(f => f.Status)
                    .FirstOrDefault() ?? "None"
            })
            .Take(10)
            .ToListAsync();

        return Ok(users);
    }
}
