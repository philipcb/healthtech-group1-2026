using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateDb
{
    /// <inheritdoc />
    public partial class UpdateAggregateTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "LocationQualifier",
                table: "Sample",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(128)",
                oldMaxLength: 128,
                oldNullable: true);

            migrationBuilder.AlterColumn<float>(
                name: "AverageTimeOverLimit",
                table: "AveragePer8HourShift",
                type: "real",
                nullable: false,
                oldClrType: typeof(TimeSpan),
                oldType: "interval");

            migrationBuilder.AlterColumn<float>(
                name: "AverageTimeOverAction",
                table: "AveragePer8HourShift",
                type: "real",
                nullable: false,
                oldClrType: typeof(TimeSpan),
                oldType: "interval");

            migrationBuilder.AlterColumn<float>(
                name: "AverageTimeInSafeLimits",
                table: "AveragePer8HourShift",
                type: "real",
                nullable: false,
                oldClrType: typeof(TimeSpan),
                oldType: "interval");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "LocationQualifier",
                table: "Sample",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "AverageTimeOverLimit",
                table: "AveragePer8HourShift",
                type: "interval",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "AverageTimeOverAction",
                table: "AveragePer8HourShift",
                type: "interval",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "AverageTimeInSafeLimits",
                table: "AveragePer8HourShift",
                type: "interval",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");
        }
    }
}
