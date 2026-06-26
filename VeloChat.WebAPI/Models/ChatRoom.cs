using System;
using System.Collections.Generic;

namespace VeloChat.WebAPI.Models;

public class ChatRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? RoomName { get; set; }
    public bool IsGroupChat { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual ICollection<RoomParticipant> RoomParticipants { get; set; } = new List<RoomParticipant>();
}
