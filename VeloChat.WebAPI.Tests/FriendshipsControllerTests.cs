using Microsoft.AspNetCore.Mvc;
using VeloChat.WebAPI.Controllers;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Tests;

public class FriendshipsControllerTests
{
    [Fact]
    public async Task Request_RejectsSelfAndUnknownUser()
    {
        using var db = new TestDatabase();
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller);

        Assert.IsType<BadRequestObjectResult>(await controller.SendFriendRequest("alice"));
        Assert.IsType<NotFoundObjectResult>(await controller.SendFriendRequest("missing"));
    }

    [Fact]
    public async Task Request_CreatesPendingFriendshipAndRejectsDuplicate()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller);

        Assert.IsType<OkObjectResult>(await controller.SendFriendRequest("bob"));
        var friendship = Assert.Single(db.Context.Friendships);
        Assert.Equal("Pending", friendship.Status);
        Assert.Equal("alice", friendship.UserId);
        Assert.Equal("bob", friendship.FriendId);
        Assert.IsType<BadRequestObjectResult>(await controller.SendFriendRequest("bob"));
    }

    [Fact]
    public async Task Accept_OnlyRecipientCanAcceptPendingRequest()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        db.Context.Friendships.Add(new Friendship { UserId = "alice", FriendId = "bob", Status = "Pending" });
        db.Context.SaveChanges();
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller, "alice");
        Assert.IsType<NotFoundObjectResult>(await controller.AcceptFriendRequest("bob"));

        TestSupport.SignIn(controller, "bob");
        Assert.IsType<OkObjectResult>(await controller.AcceptFriendRequest("alice"));
        Assert.Equal("Accepted", Assert.Single(db.Context.Friendships).Status);
    }

    [Fact]
    public async Task Profile_RequiresAcceptedFriendship()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        var friendship = new Friendship { UserId = "alice", FriendId = "bob", Status = "Pending" };
        db.Context.Friendships.Add(friendship);
        db.Context.SaveChanges();
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller);

        Assert.IsType<NotFoundObjectResult>(await controller.GetFriendProfile("bob"));
        friendship.Status = "Accepted";
        db.Context.SaveChanges();
        Assert.IsType<OkObjectResult>(await controller.GetFriendProfile("bob"));
    }

    [Fact]
    public async Task Search_EmptyQueryReturnsEmptyList()
    {
        using var db = new TestDatabase();
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller);
        var result = Assert.IsType<OkObjectResult>(await controller.SearchUsers("  "));
        Assert.Empty(Assert.IsAssignableFrom<IEnumerable<object>>(result.Value));
    }

    [Fact]
    public async Task FriendsList_OnlyIncludesAcceptedFriends()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        db.AddUser("charlie", "charlie");
        db.Context.Friendships.AddRange(
            new Friendship { UserId = "alice", FriendId = "bob", Status = "Accepted" },
            new Friendship { UserId = "alice", FriendId = "charlie", Status = "Pending" });
        db.Context.SaveChanges();
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller);

        var result = Assert.IsType<OkObjectResult>(await controller.GetFriends());
        Assert.Single(Assert.IsAssignableFrom<System.Collections.IEnumerable>(result.Value).Cast<object>());
    }

    [Fact]
    public async Task Search_ExcludesCurrentUserAndIncludesFriendshipStatus()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        db.Context.Friendships.Add(new Friendship { UserId = "alice", FriendId = "bob", Status = "Accepted" });
        db.Context.SaveChanges();
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller);

        var result = Assert.IsType<OkObjectResult>(await controller.SearchUsers("bob"));
        var item = Assert.Single(Assert.IsAssignableFrom<System.Collections.IEnumerable>(result.Value).Cast<object>());
        Assert.Equal("bob", item.GetType().GetProperty("Id")?.GetValue(item));
        Assert.Equal("Accepted", item.GetType().GetProperty("FriendshipStatus")?.GetValue(item));
    }

    [Fact]
    public async Task PendingRequests_SeparatesIncomingAndOutgoing()
    {
        using var db = new TestDatabase();
        db.AddUser("alice", "alice");
        db.AddUser("bob", "bob");
        db.AddUser("charlie", "charlie");
        db.Context.Friendships.AddRange(
            new Friendship { UserId = "bob", FriendId = "alice", Status = "Pending" },
            new Friendship { UserId = "alice", FriendId = "charlie", Status = "Pending" });
        db.Context.SaveChanges();
        var controller = new FriendshipsController(db.Context);
        TestSupport.SignIn(controller);

        var result = Assert.IsType<OkObjectResult>(await controller.GetPendingRequests());
        Assert.NotNull(result.Value);
        var incoming = result.Value.GetType().GetProperty("Incoming")?.GetValue(result.Value);
        var outgoing = result.Value.GetType().GetProperty("Outgoing")?.GetValue(result.Value);
        Assert.Single(Assert.IsAssignableFrom<System.Collections.IEnumerable>(incoming).Cast<object>());
        Assert.Single(Assert.IsAssignableFrom<System.Collections.IEnumerable>(outgoing).Cast<object>());
    }
}
