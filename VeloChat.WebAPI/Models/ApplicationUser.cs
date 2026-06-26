using Microsoft.AspNetCore.Identity;

namespace VeloChat.WebAPI.Models;

public class ApplicationUser : IdentityUser
{
    // Custom Fields for Chat App
    public string? ProfilePictureUrl { get; set; }
    public bool IsOnline { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // JWT Refresh Token fields
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    // EF Core Relationships
    public virtual ICollection<Friendship> Friendships { get; set; } = new List<Friendship>();
    public virtual ICollection<RoomParticipant> RoomParticipants { get; set; } = new List<RoomParticipant>();
}
