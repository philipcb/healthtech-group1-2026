using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateMigration
{
    /// <inheritdoc />
    public partial class ChangeAverageOver8HourShit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_AveragePer8HourShift",
                table: "AveragePer8HourShift");

            migrationBuilder.AddColumn<string>(
                name: "Field",
                table: "AveragePer8HourShift",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "AmountOfWorkerOverAction",
                table: "AveragePer8HourShift",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "AmountOfWorkerOverLimit",
                table: "AveragePer8HourShift",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_AveragePer8HourShift",
                table: "AveragePer8HourShift",
                columns: new[] { "SampleId", "ExposureType", "Field", "Time" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_AveragePer8HourShift",
                table: "AveragePer8HourShift");

            migrationBuilder.DropColumn(
                name: "Field",
                table: "AveragePer8HourShift");

            migrationBuilder.DropColumn(
                name: "AmountOfWorkerOverAction",
                table: "AveragePer8HourShift");

            migrationBuilder.DropColumn(
                name: "AmountOfWorkerOverLimit",
                table: "AveragePer8HourShift");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AveragePer8HourShift",
                table: "AveragePer8HourShift",
                columns: new[] { "SampleId", "ExposureType", "Time" });
        }
    }
}
