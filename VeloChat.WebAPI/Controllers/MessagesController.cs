using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MessagesController : ControllerBase
{
    private readonly IMongoCollection<Message> _messageCollection;

    public MessagesController(IMongoDatabase mongoDatabase)
    {
        _messageCollection = mongoDatabase.GetCollection<Message>("Messages");
    }

    [HttpGet("room/{roomId}")]
    public async Task<ActionResult<List<Message>>> GetMessages(string roomId)
    {
        var messages = await _messageCollection
            .Find(m => m.RoomId == roomId)
            .SortBy(m => m.Timestamp)
            .Limit(100)
            .ToListAsync();

        return Ok(messages);
    }
}
