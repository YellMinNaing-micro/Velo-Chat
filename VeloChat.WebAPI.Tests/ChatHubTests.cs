using Microsoft.AspNetCore.SignalR;
using Moq;
using VeloChat.WebAPI.Hubs;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Tests;

public class ChatHubTests
{
    private static ChatHub Create(TestDatabase db, string? userId)
    {
        var context = new Mock<HubCallerContext>();
        context.SetupGet(x => x.UserIdentifier).Returns(userId);
        return new ChatHub(TestSupport.MongoDatabase(), db.Context) { Context = context.Object };
    }

    [Fact]
    public async Task JoinRoom_RejectsInvalidRoomOrNonmember()
    {
        using var db = new TestDatabase();
        var hub = Create(db, "alice");
        await Assert.ThrowsAsync<HubException>(() => hub.JoinRoom("invalid"));
        await Assert.ThrowsAsync<HubException>(() => hub.JoinRoom(Guid.NewGuid().ToString()));
    }

    [Fact]
    public async Task SendMessage_RejectsEmptyAndOversizedContent()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        var room = new ChatRoom();
        room.RoomParticipants.Add(new RoomParticipant { UserId = "alice" });
        db.Context.ChatRooms.Add(room);
        db.Context.SaveChanges();
        var hub = Create(db, "alice");

        await Assert.ThrowsAsync<HubException>(() => hub.SendMessage(room.Id.ToString(), " ", "text", null));
        await Assert.ThrowsAsync<HubException>(() => hub.SendMessage(room.Id.ToString(), new string('x', 4001), "text", null));
    }

    [Fact]
    public async Task Typing_RequiresMembership()
    {
        using var db = new TestDatabase();
        var hub = Create(db, "alice");
        await Assert.ThrowsAsync<HubException>(() => hub.SendTyping(Guid.NewGuid().ToString(), true));
    }
}
