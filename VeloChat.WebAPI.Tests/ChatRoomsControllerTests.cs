using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Moq;
using VeloChat.WebAPI.Controllers;
using VeloChat.WebAPI.Hubs;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Tests;

public class ChatRoomsControllerTests
{
    private static ChatRoomsController Create(TestDatabase db)
    {
        var controller = new ChatRoomsController(db.Context, TestSupport.MongoDatabase(), Mock.Of<IHubContext<ChatHub>>());
        TestSupport.SignIn(controller);
        return controller;
    }

    [Fact]
    public async Task CreateRoom_RequiresGroupNameAndGroupType()
    {
        using var db = new TestDatabase();
        var controller = Create(db);
        Assert.IsType<BadRequestObjectResult>(await controller.CreateRoom("Private", false));
        Assert.IsType<BadRequestObjectResult>(await controller.CreateRoom("  ", true));
        Assert.Empty(db.Context.ChatRooms);
    }

    [Fact]
    public async Task CreateRoom_AddsCreatorAsMember()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        var controller = Create(db);

        Assert.IsType<OkObjectResult>(await controller.CreateRoom("  Team  ", true));
        var room = Assert.Single(db.Context.ChatRooms);
        Assert.Equal("Team", room.RoomName);
        Assert.True(room.IsGroupChat);
        Assert.Equal("alice", Assert.Single(db.Context.RoomParticipants).UserId);
    }

    [Fact]
    public async Task JoinRoom_OnlyAllowsExistingMember()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        var room = new ChatRoom { RoomName = "Team", IsGroupChat = true };
        db.Context.ChatRooms.Add(room);
        db.Context.SaveChanges();
        var controller = Create(db);

        Assert.IsType<NotFoundObjectResult>(await controller.JoinRoom(Guid.NewGuid()));
        Assert.IsType<ForbidResult>(await controller.JoinRoom(room.Id));
        db.Context.RoomParticipants.Add(new RoomParticipant { RoomId = room.Id, UserId = "alice" });
        db.Context.SaveChanges();
        Assert.IsType<OkObjectResult>(await controller.JoinRoom(room.Id));
    }

    [Fact]
    public async Task MarkRead_RequiresMembershipAndUpdatesTimestamp()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        var room = new ChatRoom();
        db.Context.ChatRooms.Add(room);
        db.Context.SaveChanges();
        var controller = Create(db);
        Assert.IsType<NotFoundObjectResult>(await controller.MarkRead(room.Id));

        var participant = new RoomParticipant { RoomId = room.Id, UserId = "alice" };
        db.Context.RoomParticipants.Add(participant);
        db.Context.SaveChanges();
        Assert.IsType<NoContentResult>(await controller.MarkRead(room.Id));
        Assert.NotNull(participant.LastReadAt);
    }

    [Fact]
    public async Task DirectMessage_RequiresAcceptedFriendship()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        var controller = Create(db);
        Assert.IsType<BadRequestObjectResult>(await controller.GetOrCreateDirectMessageRoom("bob"));

        db.Context.Friendships.Add(new Friendship { UserId = "alice", FriendId = "bob", Status = "Accepted" });
        db.Context.SaveChanges();
        Assert.IsType<OkObjectResult>(await controller.GetOrCreateDirectMessageRoom("bob"));
        Assert.Equal(2, db.Context.RoomParticipants.Count());
        Assert.IsType<OkObjectResult>(await controller.GetOrCreateDirectMessageRoom("bob"));
        Assert.Single(db.Context.ChatRooms);
    }

    [Fact]
    public async Task AddGroupMember_RejectsNonFriendAndDuplicate()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        var room = new ChatRoom { IsGroupChat = true };
        room.RoomParticipants.Add(new RoomParticipant { UserId = "alice" });
        db.Context.ChatRooms.Add(room);
        db.Context.SaveChanges();
        var controller = Create(db);

        Assert.IsType<BadRequestObjectResult>(await controller.AddGroupMember(room.Id, "bob"));
        Assert.IsType<ConflictObjectResult>(await controller.AddGroupMember(room.Id, "alice"));
    }

    [Fact]
    public async Task AddGroupMember_AddsAcceptedFriendAndNotifiesThem()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        var room = new ChatRoom { IsGroupChat = true };
        room.RoomParticipants.Add(new RoomParticipant { UserId = "alice" });
        db.Context.ChatRooms.Add(room);
        db.Context.Friendships.Add(new Friendship { UserId = "alice", FriendId = "bob", Status = "Accepted" });
        db.Context.SaveChanges();

        var client = new Mock<IClientProxy>();
        client.Setup(x => x.SendCoreAsync("RoomAdded", It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var clients = new Mock<IHubClients>();
        clients.Setup(x => x.User("bob")).Returns(client.Object);
        var hub = new Mock<IHubContext<ChatHub>>();
        hub.SetupGet(x => x.Clients).Returns(clients.Object);
        var controller = new ChatRoomsController(db.Context, TestSupport.MongoDatabase(), hub.Object);
        TestSupport.SignIn(controller);

        Assert.IsType<NoContentResult>(await controller.AddGroupMember(room.Id, "bob"));
        Assert.Equal(2, db.Context.RoomParticipants.Count());
        client.Verify(x => x.SendCoreAsync("RoomAdded", It.Is<object?[]>(args => Equals(args[0], room.Id)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AddGroupMember_RequiresExistingGroupAndCurrentMembership()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        var controller = Create(db);
        Assert.IsType<NotFoundObjectResult>(await controller.AddGroupMember(Guid.NewGuid(), "bob"));

        var direct = new ChatRoom { IsGroupChat = false };
        var group = new ChatRoom { IsGroupChat = true };
        db.Context.ChatRooms.AddRange(direct, group);
        db.Context.SaveChanges();
        Assert.IsType<BadRequestObjectResult>(await controller.AddGroupMember(direct.Id, "bob"));
        Assert.IsType<ForbidResult>(await controller.AddGroupMember(group.Id, "bob"));
    }
}
