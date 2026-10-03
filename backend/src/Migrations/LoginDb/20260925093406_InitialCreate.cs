using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.LoginDb
{
	/// <inheritdoc />
	public partial class InitialCreate : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.CreateTable(
				name: "User",
				columns: table => new
				{
					Id = table.Column<Guid>(type: "uuid", nullable: false),
					Name = table.Column<string>(
						type: "character varying(50)",
						maxLength: 50,
						nullable: false
					),
					Email = table.Column<string>(
						type: "character varying(100)",
						maxLength: 100,
						nullable: false
					),
					PasswordHash = table.Column<string>(type: "text", nullable: false),
					CreatedAt = table.Column<DateTime>(
						type: "timestamp with time zone",
						nullable: false
					),
				},
				constraints: table =>
				{
					table.PrimaryKey("PK_User", x => x.Id);
				}
			);

			migrationBuilder.CreateIndex(
				name: "IX_User_Email",
				table: "User",
				column: "Email",
				unique: true
			);

			migrationBuilder.CreateIndex(
				name: "IX_User_Name",
				table: "User",
				column: "Name",
				unique: true
			);
		}

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropTable(name: "User");
		}
	}
}
