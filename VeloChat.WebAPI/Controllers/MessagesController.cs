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
    [EndpointDescription("Returns up to 50 messages (maximum 100), newest page first internally and oldest first in the response. Pass before=<messageId> to load older messages.")]
    public async Task<ActionResult<List<Message>>> GetMessages(string roomId, [FromQuery] string? before, [FromQuery] int limit = 50)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(roomId, out var parsedRoomId)) return BadRequest("Invalid room ID.");
        if (limit is < 1 or > 100) return BadRequest("Limit must be between 1 and 100.");
        if (!await _dbContext.RoomParticipants.AnyAsync(p => p.RoomId == parsedRoomId && p.UserId == userId))
            return Forbid();

        var filter = Builders<Message>.Filter.Eq(m => m.RoomId, parsedRoomId.ToString());
        if (before != null)
        {
            if (!MongoDB.Bson.ObjectId.TryParse(before, out _)) return BadRequest("Invalid message cursor.");
            var cursor = await _messageCollection.Find(m => m.Id == before && m.RoomId == parsedRoomId.ToString())
                .FirstOrDefaultAsync();
            if (cursor == null) return NotFound("Message cursor not found in this room.");
            filter &= Builders<Message>.Filter.Or(
                Builders<Message>.Filter.Lt(m => m.Timestamp, cursor.Timestamp),
                Builders<Message>.Filter.And(
                    Builders<Message>.Filter.Eq(m => m.Timestamp, cursor.Timestamp),
                    Builders<Message>.Filter.Lt(m => m.Id, cursor.Id)));
        }

        List<Message> messages = await _messageCollection
            .Find(filter)
            .SortByDescending(m => m.Timestamp).ThenByDescending(m => m.Id)
            .Limit(limit)
            .ToListAsync();

        messages.Reverse();
        return Ok(messages);
    }
}
