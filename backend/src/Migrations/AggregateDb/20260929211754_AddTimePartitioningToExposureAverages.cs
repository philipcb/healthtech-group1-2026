using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateDb
{
	/// <inheritdoc />
	public partial class AddTimePartitioningToExposureAverages : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropPrimaryKey(name: "PK_VibrationAverage", table: "VibrationAverage");

			migrationBuilder.DropPrimaryKey(name: "PK_NoiseAverage", table: "NoiseAverage");

			migrationBuilder.DropPrimaryKey(name: "PK_DustAverage", table: "DustAverage");

			migrationBuilder.DropPrimaryKey(
				name: "PK_AveragePer8HourShift",
				table: "AveragePer8HourShift"
			);

			migrationBuilder.AddColumn<DateTime>(
				name: "Time",
				table: "VibrationAverage",
				type: "timestamp with time zone",
				nullable: true
			);

			migrationBuilder.AddColumn<DateTime>(
				name: "Time",
				table: "NoiseAverage",
				type: "timestamp with time zone",
				nullable: true
			);

			migrationBuilder.AddColumn<DateTime>(
				name: "Time",
				table: "DustAverage",
				type: "timestamp with time zone",
				nullable: true
			);

			migrationBuilder.AddColumn<DateTime>(
				name: "Time",
				table: "AveragePer8HourShift",
				type: "timestamp with time zone",
				nullable: true
			);

			migrationBuilder.Sql(
				"""
				UPDATE "NoiseAverage" SET "Time" = CURRENT_TIMESTAMP;
				UPDATE "DustAverage" SET "Time" = CURRENT_TIMESTAMP;
				UPDATE "VibrationAverage" SET "Time" = CURRENT_TIMESTAMP;
				UPDATE "AveragePer8HourShift" SET "Time" = CURRENT_TIMESTAMP;
				ALTER TABLE "NoiseAverage" ALTER COLUMN "Time" SET NOT NULL;
				ALTER TABLE "DustAverage" ALTER COLUMN "Time" SET NOT NULL;
				ALTER TABLE "VibrationAverage" ALTER COLUMN "Time" SET NOT NULL;
				ALTER TABLE "AveragePer8HourShift" ALTER COLUMN "Time" SET NOT NULL;
				"""
			);

			migrationBuilder.AddPrimaryKey(
				name: "PK_VibrationAverage",
				table: "VibrationAverage",
				columns: new[] { "SampleId", "Time" }
			);

			migrationBuilder.AddPrimaryKey(
				name: "PK_NoiseAverage",
				table: "NoiseAverage",
				columns: new[] { "SampleId", "Time" }
			);

			migrationBuilder.AddPrimaryKey(
				name: "PK_DustAverage",
				table: "DustAverage",
				columns: new[] { "SampleId", "Time" }
			);

			migrationBuilder.AddPrimaryKey(
				name: "PK_AveragePer8HourShift",
				table: "AveragePer8HourShift",
				columns: new[] { "SampleId", "ExposureType", "Time" }
			);

			migrationBuilder.CreateIndex(
				name: "IX_VibrationAverage_SampleId",
				table: "VibrationAverage",
				column: "SampleId"
			);

			migrationBuilder.CreateIndex(
				name: "IX_NoiseAverage_SampleId",
				table: "NoiseAverage",
				column: "SampleId"
			);

			migrationBuilder.CreateIndex(
				name: "IX_DustAverage_SampleId",
				table: "DustAverage",
				column: "SampleId"
			);

			migrationBuilder.CreateIndex(
				name: "IX_AveragePer8HourShift_SampleId",
				table: "AveragePer8HourShift",
				column: "SampleId"
			);

			migrationBuilder.Sql(
				"""
				SELECT create_hypertable('"NoiseAverage"', by_range('Time', INTERVAL '1 day'), migrate_data => TRUE);
				SELECT create_hypertable('"DustAverage"', by_range('Time', INTERVAL '1 day'), migrate_data => TRUE);
				SELECT create_hypertable('"VibrationAverage"', by_range('Time', INTERVAL '1 day'), migrate_data => TRUE);
				SELECT create_hypertable('"AveragePer8HourShift"', by_range('Time', INTERVAL '1 day'), migrate_data => TRUE);
				"""
			);
		}

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropTable(name: "AveragePer8HourShift");
			migrationBuilder.DropTable(name: "DustAverage");
			migrationBuilder.DropTable(name: "NoiseAverage");
			migrationBuilder.DropTable(name: "VibrationAverage");

			migrationBuilder.CreateTable(
				name: "AveragePer8HourShift",
				columns: table => new
				{
					SampleId = table.Column<Guid>(type: "uuid", nullable: false),
					ExposureType = table.Column<string>(type: "text", nullable: false),
					AverageTimeOverLimit = table.Column<TimeSpan>(
						type: "interval",
						nullable: false
					),
					AverageTimeOverAction = table.Column<TimeSpan>(
						type: "interval",
						nullable: false
					),
					AverageTimeInSafeLimits = table.Column<TimeSpan>(
						type: "interval",
						nullable: false
					),
				},
				constraints: table =>
				{
					table.PrimaryKey(
						"PK_AveragePer8HourShift",
						x => new { x.SampleId, x.ExposureType }
					);
					table.ForeignKey(
						name: "FK_AveragePer8HourShift_Sample_SampleId",
						column: x => x.SampleId,
						principalTable: "Sample",
						principalColumn: "Id",
						onDelete: ReferentialAction.Cascade
					);
				}
			);

			migrationBuilder.CreateTable(
				name: "DustAverage",
				columns: table => new
				{
					SampleId = table.Column<Guid>(type: "uuid", nullable: false),
					AveragePm1Stel = table.Column<double>(
						type: "double precision",
						nullable: false
					),
					AveragePm25Stel = table.Column<double>(
						type: "double precision",
						nullable: false
					),
					AveragePm4Stel = table.Column<double>(
						type: "double precision",
						nullable: false
					),
					AveragePm10Stel = table.Column<double>(
						type: "double precision",
						nullable: false
					),
					AveragePm1Twa = table.Column<double>(type: "double precision", nullable: false),
					AveragePm25Twa = table.Column<double>(
						type: "double precision",
						nullable: false
					),
					AveragePm4Twa = table.Column<double>(type: "double precision", nullable: false),
					AveragePm10Twa = table.Column<double>(
						type: "double precision",
						nullable: false
					),
				},
				constraints: table =>
				{
					table.PrimaryKey("PK_DustAverage", x => x.SampleId);
					table.ForeignKey(
						name: "FK_DustAverage_Sample_SampleId",
						column: x => x.SampleId,
						principalTable: "Sample",
						principalColumn: "Id",
						onDelete: ReferentialAction.Cascade
					);
				}
			);

			migrationBuilder.CreateTable(
				name: "NoiseAverage",
				columns: table => new
				{
					SampleId = table.Column<Guid>(type: "uuid", nullable: false),
					AverageLcpk = table.Column<double>(type: "double precision", nullable: false),
					AverageLaeq = table.Column<double>(type: "double precision", nullable: false),
				},
				constraints: table =>
				{
					table.PrimaryKey("PK_NoiseAverage", x => x.SampleId);
					table.ForeignKey(
						name: "FK_NoiseAverage_Sample_SampleId",
						column: x => x.SampleId,
						principalTable: "Sample",
						principalColumn: "Id",
						onDelete: ReferentialAction.Cascade
					);
				}
			);

			migrationBuilder.CreateTable(
				name: "VibrationAverage",
				columns: table => new
				{
					SampleId = table.Column<Guid>(type: "uuid", nullable: false),
					AverageExposure = table.Column<double>(
						type: "double precision",
						nullable: false
					),
				},
				constraints: table =>
				{
					table.PrimaryKey("PK_VibrationAverage", x => x.SampleId);
					table.ForeignKey(
						name: "FK_VibrationAverage_Sample_SampleId",
						column: x => x.SampleId,
						principalTable: "Sample",
						principalColumn: "Id",
						onDelete: ReferentialAction.Cascade
					);
				}
			);
		}
	}
}
