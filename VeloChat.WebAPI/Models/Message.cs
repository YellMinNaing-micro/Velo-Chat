using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace VeloChat.WebAPI.Models;

public class Message
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    public string RoomId { get; set; } = null!;       // MSSQL က ChatRoom GUID string
    public string SenderId { get; set; } = null!;     // MSSQL က AspNetUsers Id string
    public string SenderName { get; set; } = null!;
    public string MessageType { get; set; } = "text"; // text, image, file, voice
    public string Content { get; set; } = null!;
    public string? MediaUrl { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public bool IsEdited { get; set; } = false;
    public bool IsDeleted { get; set; } = false;
    public List<ReadReceipt> ReadBy { get; set; } = new List<ReadReceipt>();
}
