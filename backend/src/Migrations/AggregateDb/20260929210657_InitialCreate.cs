using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateDb
{
	/// <inheritdoc />
	public partial class InitialCreate : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.CreateTable(
				name: "Sample",
				columns: table => new
				{
					Id = table.Column<Guid>(type: "uuid", nullable: false),
					SampleCount = table.Column<int>(type: "integer", nullable: false),
					SampleType = table.Column<string>(type: "text", nullable: false),
					SampleQualifier = table.Column<string>(
						type: "character varying(128)",
						maxLength: 128,
						nullable: false
					),
				},
				constraints: table =>
				{
					table.PrimaryKey("PK_Sample", x => x.Id);
					table.CheckConstraint(
						"CK_Sample_SampleCount_Enough",
						"\"SampleCount\" >= 5"
					);
				}
			);

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

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropTable(name: "AveragePer8HourShift");

			migrationBuilder.DropTable(name: "DustAverage");

			migrationBuilder.DropTable(name: "NoiseAverage");

			migrationBuilder.DropTable(name: "VibrationAverage");

			migrationBuilder.DropTable(name: "Sample");
		}
	}
}
