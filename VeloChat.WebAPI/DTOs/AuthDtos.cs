namespace VeloChat.WebAPI.DTOs;

public record RegisterDto(string Username, string Email, string Password, string? ProfilePictureUrl, string? FullName);
public record LoginDto(string Email, string Password);
public record TokenDto(string AccessToken, string RefreshToken);
public record UserProfileDto(string Id, string Username, string Email, string? FullName, string? ProfilePictureUrl);
public record UpdateProfileDto(string Username, string Email, string? FullName, string? ProfilePictureUrl);
public record ChangePasswordDto(string OldPassword, string NewPassword);
