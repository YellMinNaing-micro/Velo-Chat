using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VeloChat.WebAPI.Models;

namespace VeloChat.WebAPI.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Friendship> Friendships { get; set; }
    public DbSet<ChatRoom> ChatRooms { get; set; }
    public DbSet<RoomParticipant> RoomParticipants { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); // Identity Tables တွေ ထွက်လာဖို့အတွက် မဖြစ်မနေ လိုပါတယ်

        // Composite Key for RoomParticipant
        builder.Entity<RoomParticipant>()
            .HasKey(rp => new { rp.RoomId, rp.UserId });

        // RoomParticipant Relationships Config
        builder.Entity<RoomParticipant>()
            .HasOne(rp => rp.ChatRoom)
            .WithMany(cr => cr.RoomParticipants)
            .HasForeignKey(rp => rp.RoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<RoomParticipant>()
            .HasOne(rp => rp.User)
            .WithMany(u => u.RoomParticipants)
            .HasForeignKey(rp => rp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Friendship Relationships Config
        builder.Entity<Friendship>()
            .HasOne(f => f.User)
            .WithMany(u => u.Friendships)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Friendship>()
            .HasOne(f => f.Friend)
            .WithMany()
            .HasForeignKey(f => f.FriendId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
