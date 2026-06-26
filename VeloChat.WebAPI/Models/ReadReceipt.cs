using System;

namespace VeloChat.WebAPI.Models;

public class ReadReceipt
{
    public string UserId { get; set; } = null!;
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}
