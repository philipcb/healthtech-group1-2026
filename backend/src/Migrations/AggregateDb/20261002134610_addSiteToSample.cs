using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateDb
{
    /// <inheritdoc />
    public partial class addSiteToSample : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Site",
                table: "Sample",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Site",
                table: "Sample");
        }
    }
}
