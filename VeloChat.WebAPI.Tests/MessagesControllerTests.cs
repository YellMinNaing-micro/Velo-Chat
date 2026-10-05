using Microsoft.AspNetCore.Mvc;
using VeloChat.WebAPI.Controllers;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Tests;

public class MessagesControllerTests
{
    [Theory]
    [InlineData("invalid", null, 50, typeof(BadRequestObjectResult))]
    [InlineData("00000000-0000-0000-0000-000000000001", null, 0, typeof(BadRequestObjectResult))]
    [InlineData("00000000-0000-0000-0000-000000000001", null, 101, typeof(BadRequestObjectResult))]
    [InlineData("00000000-0000-0000-0000-000000000001", null, 50, typeof(ForbidResult))]
    public async Task GetMessages_RejectsInvalidRequestOrNonmember(string roomId, string? before, int limit, Type expected)
    {
        using var db = new TestDatabase();
        var controller = new MessagesController(TestSupport.MongoDatabase(), db.Context);
        TestSupport.SignIn(controller);

        var result = await controller.GetMessages(roomId, before, limit);
        Assert.IsType(expected, result.Result);
    }

    [Fact]
    public async Task GetMessages_RejectsInvalidCursorForMember()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        var room = new ChatRoom();
        room.RoomParticipants.Add(new RoomParticipant { UserId = "alice" });
        db.Context.ChatRooms.Add(room);
        db.Context.SaveChanges();
        var controller = new MessagesController(TestSupport.MongoDatabase(), db.Context);
        TestSupport.SignIn(controller);

        var result = await controller.GetMessages(room.Id.ToString(), "bad-cursor");
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
