namespace VeloChat.WebAPI.DTOs;

public record RegisterDto(string Username, string Email, string Password, string? ProfilePictureUrl, string? FullName);
public record LoginDto(string Email, string Password);
public record TokenDto(string AccessToken, string RefreshToken);
