using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using MongoDB.Driver;
using VeloChat.WebAPI.Data;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Tests;

internal sealed class TestDatabase : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    public AppDbContext Context { get; }

    public TestDatabase()
    {
        _connection.Open();
        Context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection).Options);
        Context.Database.EnsureCreated();
    }

    public ApplicationUser AddUser(string id, string name)
    {
        var user = new ApplicationUser { Id = id, UserName = name, Email = $"{name}@example.com", FullName = name };
        Context.Users.Add(user);
        Context.SaveChanges();
        return user;
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}

internal static class TestSupport
{
    public static void SignIn(ControllerBase controller, string userId = "alice") =>
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Name, userId)],
                "Test"))
            }
        };

    public static IMongoDatabase MongoDatabase() => Mock.Of<IMongoDatabase>(
        db => db.GetCollection<Message>("Messages", It.IsAny<MongoCollectionSettings>()) == Mock.Of<IMongoCollection<Message>>());
}
