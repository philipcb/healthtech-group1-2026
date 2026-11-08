using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateMigration
{
	/// <inheritdoc />
	public partial class AddHourAndDayAmountInAverage : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.AddColumn<int>(
				name: "DayCount",
				table: "AveragePer8HourShift",
				type: "integer",
				nullable: false,
				defaultValue: 0
			);

			migrationBuilder.AddColumn<int>(
				name: "HourCount",
				table: "AveragePer8HourShift",
				type: "integer",
				nullable: false,
				defaultValue: 0
			);
		}

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropColumn(name: "DayCount", table: "AveragePer8HourShift");

			migrationBuilder.DropColumn(name: "HourCount", table: "AveragePer8HourShift");
		}
	}
}
