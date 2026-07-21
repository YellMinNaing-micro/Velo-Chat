using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using VeloChat.WebAPI.DTOs;
using VeloChat.WebAPI.Models;
using VeloChat.WebAPI.Services;

namespace VeloChat.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Tags("Authentication")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        IConfiguration config)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _config = config;
    }

    [HttpPost("register")]
    [EndpointSummary("Register a new user")]
    [EndpointDescription("Creates a new user account using a unique email address and username.")]
    public async Task<IActionResult> Register([FromBody] RegisterDto model)
    {
        ApplicationUser? userExists = await _userManager.FindByEmailAsync(model.Email);
        if (userExists != null)
            return BadRequest("User already exists with this email.");

        userExists = await _userManager.FindByNameAsync(model.Username);
        if (userExists != null)
            return BadRequest("Username is already taken.");

        ApplicationUser user = new ApplicationUser
        {
            Email = model.Email,
            SecurityStamp = Guid.NewGuid().ToString(),
            UserName = model.Username,
            ProfilePictureUrl = model.ProfilePictureUrl,
            FullName = model.FullName,
            CreatedAt = DateTime.UtcNow,
            IsOnline = false
        };

        IdentityResult result = await _userManager.CreateAsync(user, model.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }
            return BadRequest(ModelState);
        }

        return Ok(new { Message = "User registered successfully!" });
    }

    [HttpPost("login")]
    [EndpointSummary("Log in a user")]
    [EndpointDescription("Authenticates a user with an email address or username and returns access and refresh tokens.")]
    public async Task<IActionResult> Login([FromBody] LoginDto model)
    {
        ApplicationUser? user = await _userManager.FindByEmailAsync(model.Email) ?? await _userManager.FindByNameAsync(model.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password))
        {
            return Unauthorized("Invalid credentials.");
        }

        IList<string> roles = await _userManager.GetRolesAsync(user);
        string accessToken = _tokenService.GenerateAccessToken(user, roles);
        string refreshToken = _tokenService.GenerateRefreshToken();

        double refreshTokenDurationDays = double.Parse(_config["Jwt:RefreshTokenDurationDays"] ?? "7");
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshTokenDurationDays);
        user.IsOnline = true; // Mark as online upon login

        await _userManager.UpdateAsync(user);

        return Ok(new TokenDto(accessToken, refreshToken));
    }

    [HttpPost("refresh")]
    [EndpointSummary("Refresh authentication tokens")]
    [EndpointDescription("Validates an expired access token and a valid refresh token, then issues a new token pair.")]
    public async Task<IActionResult> Refresh([FromBody] TokenDto model)
    {
        ClaimsPrincipal? principal = _tokenService.GetPrincipalFromExpiredToken(model.AccessToken);
        if (principal == null)
        {
            return BadRequest("Invalid access token.");
        }

        string? userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest("Invalid claims inside token.");
        }

        ApplicationUser? user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.RefreshToken != model.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return BadRequest("Invalid or expired refresh token.");
        }

        IList<string> roles = await _userManager.GetRolesAsync(user);
        string newAccessToken = _tokenService.GenerateAccessToken(user, roles);
        string newRefreshToken = _tokenService.GenerateRefreshToken();

        double refreshTokenDurationDays = double.Parse(_config["Jwt:RefreshTokenDurationDays"] ?? "7");
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshTokenDurationDays);
        await _userManager.UpdateAsync(user);

        return Ok(new TokenDto(newAccessToken, newRefreshToken));
    }

    [Authorize]
    [HttpPost("revoke")]
    [EndpointSummary("Revoke the current user's token")]
    [EndpointDescription("Invalidates the authenticated user's refresh token and marks the user as offline.")]
    public async Task<IActionResult> Revoke()
    {
        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest("Invalid user identity.");
        }

        ApplicationUser? user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound("User not found.");

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        user.IsOnline = false;
        await _userManager.UpdateAsync(user);

        return Ok("Token revoked and user status set to offline.");
    }

    [Authorize]
    [HttpGet("me")]
    [EndpointSummary("Get the current user's profile")]
    [EndpointDescription("Returns the authenticated user's account and profile information.")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        ApplicationUser? user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound("User not found.");

        return Ok(ToProfileDto(user));
    }

    [Authorize]
    [HttpPut("me")]
    [EndpointSummary("Update the current user's profile")]
    [EndpointDescription("Updates the authenticated user's username, email, full name, and profile picture URL.")]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileDto model)
    {
        ApplicationUser? user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound("User not found.");

        string username = model.Username.Trim();
        string email = model.Email.Trim();

        if (string.IsNullOrWhiteSpace(username))
            ModelState.AddModelError(nameof(model.Username), "Username is required.");
        if (string.IsNullOrWhiteSpace(email))
            ModelState.AddModelError(nameof(model.Email), "Email is required.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        ApplicationUser? usernameOwner = await _userManager.FindByNameAsync(username);
        if (usernameOwner != null && usernameOwner.Id != user.Id)
        {
            ModelState.AddModelError(nameof(model.Username), "Username is already taken.");
        }

        ApplicationUser? emailOwner = await _userManager.FindByEmailAsync(email);
        if (emailOwner != null && emailOwner.Id != user.Id)
        {
            ModelState.AddModelError(nameof(model.Email), "Email is already in use.");
        }

        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        user.UserName = username;
        user.NormalizedUserName = _userManager.NormalizeName(user.UserName);
        user.Email = email;
        user.NormalizedEmail = _userManager.NormalizeEmail(user.Email);
        user.FullName = string.IsNullOrWhiteSpace(model.FullName) ? null : model.FullName.Trim();
        user.ProfilePictureUrl = string.IsNullOrWhiteSpace(model.ProfilePictureUrl) ? null : model.ProfilePictureUrl.Trim();

        IdentityResult result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            foreach (IdentityError error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return ValidationProblem(ModelState);
        }

        return Ok(ToProfileDto(user));
    }

    [Authorize]
    [HttpPost("change-password")]
    [EndpointSummary("Change the current user's password")]
    [EndpointDescription("Verifies the user's old password before replacing it with a new password that satisfies the configured password policy.")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
    {
        ApplicationUser? user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound("User not found.");

        IdentityResult result = await _userManager.ChangePasswordAsync(user, model.OldPassword, model.NewPassword);
        if (!result.Succeeded)
        {
            foreach (IdentityError error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return ValidationProblem(ModelState);
        }

        return Ok(new { Message = "Password changed successfully." });
    }

    private static UserProfileDto ToProfileDto(ApplicationUser user) =>
        new(user.Id, user.UserName ?? string.Empty, user.Email ?? string.Empty, user.FullName, user.ProfilePictureUrl);
}
