using System;

namespace VeloChat.WebAPI.Models;

public class Friendship
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public string FriendId { get; set; } = null!;
    public string Status { get; set; } = "Pending"; // Pending, Accepted, Blocked
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual ApplicationUser User { get; set; } = null!;
    public virtual ApplicationUser Friend { get; set; } = null!;
}
