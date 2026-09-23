using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VeloChat.WebAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomLastReadAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastReadAt",
                table: "RoomParticipants",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastReadAt",
                table: "RoomParticipants");
        }
    }
}
