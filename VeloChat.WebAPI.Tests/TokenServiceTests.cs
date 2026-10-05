using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using VeloChat.WebAPI.Models;
using VeloChat.WebAPI.Services;

namespace VeloChat.WebAPI.Tests;

public class TokenServiceTests
{
    private static TokenService CreateService() => new(new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-only-signing-key-at-least-32-bytes-long",
            ["Jwt:Issuer"] = "VeloChat.Tests",
            ["Jwt:Audience"] = "VeloChat.Tests.Client",
            ["Jwt:AccessTokenDurationMinutes"] = "15"
        })
        .Build());

    [Fact]
    public void GenerateAccessToken_IncludesUserAndRoles()
    {
        var service = CreateService();
        var user = new ApplicationUser { Id = "user-123", UserName = "alice", Email = "alice@example.com" };

        var token = service.GenerateAccessToken(user, ["Admin", "Member"]);
        var principal = service.GetPrincipalFromExpiredToken(token);

        Assert.NotNull(principal);
        Assert.Equal(user.Id, principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal(user.UserName, principal.FindFirst(ClaimTypes.Name)?.Value);
        Assert.Equal(2, principal.FindAll(ClaimTypes.Role).Count());
        Assert.True(principal.IsInRole("Admin"));
        Assert.True(principal.IsInRole("Member"));
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsUnique64ByteValues()
    {
        var service = CreateService();

        var first = service.GenerateRefreshToken();
        var second = service.GenerateRefreshToken();

        Assert.Equal(64, Convert.FromBase64String(first).Length);
        Assert.Equal(64, Convert.FromBase64String(second).Length);
        Assert.NotEqual(first, second);
    }

    [Fact]
    public void AccessToken_RejectsTampering()
    {
        var service = CreateService();
        var token = service.GenerateAccessToken(new ApplicationUser { Id = "alice" }, []);
        var parts = token.Split('.');
        parts[2] = parts[2][0] == 'a' ? "b" + parts[2][1..] : "a" + parts[2][1..];

        Assert.ThrowsAny<SecurityTokenException>(() => service.GetPrincipalFromExpiredToken(string.Join('.', parts)));
    }

    [Fact]
    public void MissingSigningKey_ThrowsClearError()
    {
        var service = new TokenService(new ConfigurationBuilder().Build());
        Assert.Throws<InvalidOperationException>(() => service.GenerateAccessToken(new ApplicationUser(), []));
    }
}
