using System;

namespace VeloChat.WebAPI.Models;

public class RoomParticipant
{
    public Guid RoomId { get; set; }
    public string UserId { get; set; } = null!;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public virtual ChatRoom ChatRoom { get; set; } = null!;
    public virtual ApplicationUser User { get; set; } = null!;
}
