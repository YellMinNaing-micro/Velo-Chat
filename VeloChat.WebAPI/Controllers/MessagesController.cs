using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using System;
using System.Linq;
using System.Security.Claims;
using VeloChat.WebAPI.Data;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[Tags("Messages")]
public class MessagesController : ControllerBase
{
    private readonly IMongoCollection<Message> _messageCollection;
    private readonly AppDbContext _dbContext;

    public MessagesController(IMongoDatabase mongoDatabase, AppDbContext dbContext)
    {
        _messageCollection = mongoDatabase.GetCollection<Message>("Messages");
        _dbContext = dbContext;
    }

    [HttpGet("room/{roomId}")]
    [EndpointSummary("Get messages in a chat room")]
    [EndpointDescription("Returns the latest 100 messages in a room belonging to the authenticated user, ordered from oldest to newest.")]
    public async Task<ActionResult<List<Message>>> GetMessages(string roomId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(roomId, out var parsedRoomId)) return BadRequest("Invalid room ID.");
        if (!await _dbContext.RoomParticipants.AnyAsync(p => p.RoomId == parsedRoomId && p.UserId == userId))
            return Forbid();

        List<Message> messages = await _messageCollection
            .Find(m => m.RoomId == roomId)
            .SortByDescending(m => m.Timestamp)
            .Limit(100)
            .ToListAsync();

        messages.Reverse();
        return Ok(messages);
    }
}
