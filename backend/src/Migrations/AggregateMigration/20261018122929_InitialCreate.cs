using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations.AggregateMigration
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
                    Site = table.Column<string>(type: "text", nullable: false),
                    LocationQualifier = table.Column<Guid>(type: "uuid", nullable: true),
                    LocationName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    JobQualifier = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sample", x => x.Id);
                    table.CheckConstraint("CK_Sample_SampleCount_Enough", "\"SampleCount\" >= 5");
                });

            migrationBuilder.CreateTable(
                name: "AveragePer8HourShift",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExposureType = table.Column<string>(type: "text", nullable: false),
                    AverageTimeOverLimit = table.Column<double>(type: "double precision", nullable: false),
                    AverageTimeOverAction = table.Column<double>(type: "double precision", nullable: false),
                    AverageTimeInSafeLimits = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AveragePer8HourShift", x => new { x.SampleId, x.ExposureType, x.Time });
                    table.ForeignKey(
                        name: "FK_AveragePer8HourShift_Sample_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Sample",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DustAverage",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AveragePm1Stel = table.Column<double>(type: "double precision", nullable: false),
                    AveragePm25Stel = table.Column<double>(type: "double precision", nullable: false),
                    AveragePm4Stel = table.Column<double>(type: "double precision", nullable: false),
                    AveragePm10Stel = table.Column<double>(type: "double precision", nullable: false),
                    AveragePm1Twa = table.Column<double>(type: "double precision", nullable: false),
                    AveragePm25Twa = table.Column<double>(type: "double precision", nullable: false),
                    AveragePm4Twa = table.Column<double>(type: "double precision", nullable: false),
                    AveragePm10Twa = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DustAverage", x => new { x.SampleId, x.Time });
                    table.ForeignKey(
                        name: "FK_DustAverage_Sample_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Sample",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NoiseAverage",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AverageLcpk = table.Column<double>(type: "double precision", nullable: false),
                    AverageLaeq = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoiseAverage", x => new { x.SampleId, x.Time });
                    table.ForeignKey(
                        name: "FK_NoiseAverage_Sample_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Sample",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VibrationAverage",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AverageExposure = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VibrationAverage", x => new { x.SampleId, x.Time });
                    table.ForeignKey(
                        name: "FK_VibrationAverage_Sample_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Sample",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AveragePer8HourShift_SampleId",
                table: "AveragePer8HourShift",
                column: "SampleId");

            migrationBuilder.CreateIndex(
                name: "IX_DustAverage_SampleId",
                table: "DustAverage",
                column: "SampleId");

            migrationBuilder.CreateIndex(
                name: "IX_NoiseAverage_SampleId",
                table: "NoiseAverage",
                column: "SampleId");

            migrationBuilder.CreateIndex(
                name: "IX_VibrationAverage_SampleId",
                table: "VibrationAverage",
                column: "SampleId");

                migrationBuilder.Sql(
                """
                SELECT create_hypertable(
                    '"NoiseAverage"',
                    by_range('Time', INTERVAL '1 day'),
                    migrate_data => TRUE
                );

                SELECT create_hypertable(
                    '"DustAverage"',
                    by_range('Time', INTERVAL '1 day'),
                    migrate_data => TRUE
                );

                SELECT create_hypertable(
                    '"VibrationAverage"',
                    by_range('Time', INTERVAL '1 day'),
                    migrate_data => TRUE
                );

                SELECT create_hypertable(
                    '"AveragePer8HourShift"',
                    by_range('Time', INTERVAL '1 day'),
                    migrate_data => TRUE
                );
                """
);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AveragePer8HourShift");

            migrationBuilder.DropTable(
                name: "DustAverage");

            migrationBuilder.DropTable(
                name: "NoiseAverage");

            migrationBuilder.DropTable(
                name: "VibrationAverage");

            migrationBuilder.DropTable(
                name: "Sample");
        }
    }
}
