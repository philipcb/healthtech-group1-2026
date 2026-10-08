using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateDb
{
    /// <inheritdoc />
    public partial class UpdateSampleChangeQualifiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SampleQualifier",
                table: "Sample");

            migrationBuilder.DropColumn(
                name: "SampleType",
                table: "Sample");

            migrationBuilder.AddColumn<string>(
                name: "JobQualifier",
                table: "Sample",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LocationQualifier",
                table: "Sample",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JobQualifier",
                table: "Sample");

            migrationBuilder.DropColumn(
                name: "LocationQualifier",
                table: "Sample");

            migrationBuilder.AddColumn<string>(
                name: "SampleQualifier",
                table: "Sample",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SampleType",
                table: "Sample",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
