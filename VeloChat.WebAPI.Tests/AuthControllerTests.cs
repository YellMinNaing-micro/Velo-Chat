using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using VeloChat.WebAPI.Controllers;
using VeloChat.WebAPI.DTOs;
using VeloChat.WebAPI.Models;
using VeloChat.WebAPI.Services;

namespace VeloChat.WebAPI.Tests;

public class AuthControllerTests
{
    private readonly Mock<UserManager<ApplicationUser>> _users = new(
        Mock.Of<IUserStore<ApplicationUser>>(),
        Mock.Of<IOptions<IdentityOptions>>(),
        Mock.Of<IPasswordHasher<ApplicationUser>>(),
        Array.Empty<IUserValidator<ApplicationUser>>(),
        Array.Empty<IPasswordValidator<ApplicationUser>>(),
        Mock.Of<ILookupNormalizer>(),
        new IdentityErrorDescriber(),
        Mock.Of<IServiceProvider>(),
        Mock.Of<ILogger<UserManager<ApplicationUser>>>());

    private readonly Mock<ITokenService> _tokens = new();

    private AuthController Create()
    {
        var controller = new AuthController(_users.Object, _tokens.Object,
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build());
        TestSupport.SignIn(controller);
        return controller;
    }

    [Fact]
    public async Task Login_RejectsUnknownUserAndWrongPassword()
    {
        var controller = Create();
        var input = new LoginDto("alice", "wrong");
        Assert.IsType<UnauthorizedObjectResult>(await controller.Login(input));

        _users.Setup(x => x.FindByEmailAsync("alice")).ReturnsAsync(new ApplicationUser { Id = "alice" });
        _users.Setup(x => x.CheckPasswordAsync(It.IsAny<ApplicationUser>(), "wrong")).ReturnsAsync(false);
        Assert.IsType<UnauthorizedObjectResult>(await controller.Login(input));
    }

    [Fact]
    public async Task Login_ReturnsTokensAndMarksUserOnline()
    {
        var user = new ApplicationUser { Id = "alice" };
        _users.Setup(x => x.FindByEmailAsync("alice")).ReturnsAsync(user);
        _users.Setup(x => x.CheckPasswordAsync(user, "password")).ReturnsAsync(true);
        _users.Setup(x => x.GetRolesAsync(user)).ReturnsAsync([]);
        _users.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
        _tokens.Setup(x => x.GenerateAccessToken(user, It.IsAny<IList<string>>())).Returns("access");
        _tokens.Setup(x => x.GenerateRefreshToken()).Returns("refresh");

        var result = Assert.IsType<OkObjectResult>(await Create().Login(new LoginDto("alice", "password")));
        Assert.Equal(new TokenDto("access", "refresh"), result.Value);
        Assert.Equal("refresh", user.RefreshToken);
        Assert.True(user.IsOnline);
        Assert.True(user.RefreshTokenExpiryTime > DateTime.UtcNow);
    }

    [Fact]
    public async Task Refresh_RejectsMissingClaimsAndInvalidRefreshToken()
    {
        _tokens.Setup(x => x.GetPrincipalFromExpiredToken("access"))
            .Returns(new ClaimsPrincipal(new ClaimsIdentity()));
        var controller = Create();
        Assert.IsType<BadRequestObjectResult>(await controller.Refresh(new TokenDto("access", "refresh")));

        _tokens.Setup(x => x.GetPrincipalFromExpiredToken("access"))
            .Returns(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "alice")])));
        _users.Setup(x => x.FindByIdAsync("alice"))
            .ReturnsAsync(new ApplicationUser { Id = "alice", RefreshToken = "other", RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(1) });
        Assert.IsType<BadRequestObjectResult>(await controller.Refresh(new TokenDto("access", "refresh")));
    }

    [Fact]
    public async Task Revoke_ClearsRefreshTokenAndOnlineStatus()
    {
        var user = new ApplicationUser
        {
            Id = "alice", RefreshToken = "refresh", RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(1), IsOnline = true
        };
        _users.Setup(x => x.FindByIdAsync("alice")).ReturnsAsync(user);
        _users.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        Assert.IsType<OkObjectResult>(await Create().Revoke());
        Assert.Null(user.RefreshToken);
        Assert.Null(user.RefreshTokenExpiryTime);
        Assert.False(user.IsOnline);
    }

    [Fact]
    public async Task Register_RejectsExistingEmailOrUsername()
    {
        var input = new RegisterDto("alice", "alice@example.com", "Password1!", null, null);
        var controller = Create();
        _users.Setup(x => x.FindByEmailAsync(input.Email)).ReturnsAsync(new ApplicationUser());
        Assert.IsType<BadRequestObjectResult>(await controller.Register(input));

        _users.Setup(x => x.FindByEmailAsync(input.Email)).ReturnsAsync((ApplicationUser?)null);
        _users.Setup(x => x.FindByNameAsync(input.Username)).ReturnsAsync(new ApplicationUser());
        Assert.IsType<BadRequestObjectResult>(await controller.Register(input));
    }

    [Fact]
    public async Task Register_CreatesUserWithProfileFields()
    {
        var input = new RegisterDto("alice", "alice@example.com", "Password1!", "picture", "Alice Smith");
        ApplicationUser? created = null;
        _users.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), input.Password))
            .Callback<ApplicationUser, string>((user, _) => created = user)
            .ReturnsAsync(IdentityResult.Success);

        Assert.IsType<OkObjectResult>(await Create().Register(input));
        Assert.NotNull(created);
        Assert.Equal(input.FullName, created.FullName);
        Assert.Equal(input.ProfilePictureUrl, created.ProfilePictureUrl);
        Assert.False(created.IsOnline);
    }

    [Fact]
    public async Task Profile_ReturnsCurrentUser()
    {
        var user = new ApplicationUser { Id = "alice", UserName = "alice", Email = "alice@example.com", FullName = "Alice" };
        _users.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);

        var result = await Create().GetProfile();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(new UserProfileDto("alice", "alice", "alice@example.com", "Alice", null), ok.Value);
    }

    [Fact]
    public async Task ChangePassword_ReportsIdentityFailure()
    {
        var user = new ApplicationUser { Id = "alice" };
        _users.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);
        _users.Setup(x => x.ChangePasswordAsync(user, "wrong", "new-password"))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "PasswordMismatch", Description = "Wrong password" }));

        var result = await Create().ChangePassword(new ChangePasswordDto("wrong", "new-password"));
        Assert.IsType<ObjectResult>(result);
    }

    [Fact]
    public async Task Refresh_RotatesRefreshToken()
    {
        var user = new ApplicationUser
        {
            Id = "alice", RefreshToken = "old-refresh", RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(1)
        };
        _tokens.Setup(x => x.GetPrincipalFromExpiredToken("old-access"))
            .Returns(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "alice")])));
        _users.Setup(x => x.FindByIdAsync("alice")).ReturnsAsync(user);
        _users.Setup(x => x.GetRolesAsync(user)).ReturnsAsync([]);
        _users.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
        _tokens.Setup(x => x.GenerateAccessToken(user, It.IsAny<IList<string>>())).Returns("new-access");
        _tokens.Setup(x => x.GenerateRefreshToken()).Returns("new-refresh");

        var result = Assert.IsType<OkObjectResult>(await Create().Refresh(new TokenDto("old-access", "old-refresh")));
        Assert.Equal(new TokenDto("new-access", "new-refresh"), result.Value);
        Assert.Equal("new-refresh", user.RefreshToken);
    }

    [Fact]
    public async Task UpdateProfile_TrimsFieldsAndNormalizesAccount()
    {
        var user = new ApplicationUser { Id = "alice", UserName = "old", Email = "old@example.com" };
        _users.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);
        _users.Setup(x => x.NormalizeName("alice")).Returns("ALICE");
        _users.Setup(x => x.NormalizeEmail("alice@example.com")).Returns("ALICE@EXAMPLE.COM");
        _users.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        var result = await Create().UpdateProfile(new UpdateProfileDto(
            " alice ", " alice@example.com ", " Alice Smith ", " picture "));
        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal("alice", user.UserName);
        Assert.Equal("ALICE", user.NormalizedUserName);
        Assert.Equal("alice@example.com", user.Email);
        Assert.Equal("ALICE@EXAMPLE.COM", user.NormalizedEmail);
        Assert.Equal("Alice Smith", user.FullName);
        Assert.Equal("picture", user.ProfilePictureUrl);
    }

    [Fact]
    public async Task UpdateProfile_RejectsAnotherUsersName()
    {
        var user = new ApplicationUser { Id = "alice" };
        _users.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);
        _users.Setup(x => x.FindByNameAsync("bob")).ReturnsAsync(new ApplicationUser { Id = "bob" });

        var result = await Create().UpdateProfile(new UpdateProfileDto("bob", "alice@example.com", null, null));
        Assert.IsType<ObjectResult>(result.Result);
        _users.Verify(x => x.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Never);
    }

    [Fact]
    public async Task ChangePassword_Succeeds()
    {
        var user = new ApplicationUser { Id = "alice" };
        _users.Setup(x => x.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(user);
        _users.Setup(x => x.ChangePasswordAsync(user, "old", "new"))
            .ReturnsAsync(IdentityResult.Success);

        Assert.IsType<OkObjectResult>(await Create().ChangePassword(new ChangePasswordDto("old", "new")));
    }
}
