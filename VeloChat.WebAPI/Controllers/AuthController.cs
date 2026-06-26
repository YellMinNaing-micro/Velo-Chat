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
    public async Task<IActionResult> Register([FromBody] RegisterDto model)
    {
        var userExists = await _userManager.FindByEmailAsync(model.Email);
        if (userExists != null)
            return BadRequest("User already exists with this email.");

        userExists = await _userManager.FindByNameAsync(model.Username);
        if (userExists != null)
            return BadRequest("Username is already taken.");

        var user = new ApplicationUser
        {
            Email = model.Email,
            SecurityStamp = Guid.NewGuid().ToString(),
            UserName = model.Username,
            ProfilePictureUrl = model.ProfilePictureUrl,
            FullName = model.FullName,
            CreatedAt = DateTime.UtcNow,
            IsOnline = false
        };

        var result = await _userManager.CreateAsync(user, model.Password);
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
    public async Task<IActionResult> Login([FromBody] LoginDto model)
    {
        var user = await _userManager.FindByEmailAsync(model.Email) ?? await _userManager.FindByNameAsync(model.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password))
        {
            return Unauthorized("Invalid credentials.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _tokenService.GenerateAccessToken(user, roles);
        var refreshToken = _tokenService.GenerateRefreshToken();

        var refreshTokenDurationDays = double.Parse(_config["Jwt:RefreshTokenDurationDays"] ?? "7");
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshTokenDurationDays);
        user.IsOnline = true; // Mark as online upon login

        await _userManager.UpdateAsync(user);

        return Ok(new TokenDto(accessToken, refreshToken));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] TokenDto model)
    {
        var principal = _tokenService.GetPrincipalFromExpiredToken(model.AccessToken);
        if (principal == null)
        {
            return BadRequest("Invalid access token.");
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest("Invalid claims inside token.");
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.RefreshToken != model.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return BadRequest("Invalid or expired refresh token.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var newAccessToken = _tokenService.GenerateAccessToken(user, roles);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        var refreshTokenDurationDays = double.Parse(_config["Jwt:RefreshTokenDurationDays"] ?? "7");
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshTokenDurationDays);
        await _userManager.UpdateAsync(user);

        return Ok(new TokenDto(newAccessToken, newRefreshToken));
    }

    [Authorize]
    [HttpPost("revoke")]
    public async Task<IActionResult> Revoke()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest("Invalid user identity.");
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return NotFound("User not found.");

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        user.IsOnline = false;
        await _userManager.UpdateAsync(user);

        return Ok("Token revoked and user status set to offline.");
    }
}
