using Backend.Models;
using Microsoft.EntityFrameworkCore;

public class AggregateDbContext : DbContext
{
	public AggregateDbContext(DbContextOptions<AggregateDbContext> options)
		: base(options) { }

	public DbSet<Sample> Samples { get; set; }
	public DbSet<NoiseAverage> NoiseAverages { get; set; }
	public DbSet<DustAverage> DustAverages { get; set; }
	public DbSet<VibrationAverage> VibrationAverages { get; set; }
	public DbSet<AveragePer8HourShift> AveragesPer8HourShift { get; set; }

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);

		modelBuilder.Entity<Sample>(entity =>
		{
			entity.ToTable(
				"Sample",
				table =>
					table.HasCheckConstraint(
						"CK_Sample_SampleCount_Enough",
						"\"SampleCount\" >= 5"
					)
			);
			entity.HasKey(sample => sample.Id);
			entity.Property(sample => sample.SampleType).HasConversion<string>();
			entity.Property(sample => sample.SampleQualifier).HasMaxLength(128).IsRequired();
		});

		modelBuilder.Entity<NoiseAverage>(entity =>
		{
			entity.ToTable("NoiseAverage");
			entity.HasKey(average => new { average.SampleId, average.Time });
			entity
				.HasOne(average => average.Sample)
				.WithMany(sample => sample.NoiseAverages)
				.HasForeignKey(average => average.SampleId);
		});

		modelBuilder.Entity<DustAverage>(entity =>
		{
			entity.ToTable("DustAverage");
			entity.HasKey(average => new { average.SampleId, average.Time });
			entity
				.HasOne(average => average.Sample)
				.WithMany(sample => sample.DustAverages)
				.HasForeignKey(average => average.SampleId);
		});

		modelBuilder.Entity<VibrationAverage>(entity =>
		{
			entity.ToTable("VibrationAverage");
			entity.HasKey(average => new { average.SampleId, average.Time });
			entity
				.HasOne(average => average.Sample)
				.WithMany(sample => sample.VibrationAverages)
				.HasForeignKey(average => average.SampleId);
		});

		modelBuilder.Entity<AveragePer8HourShift>(entity =>
		{
			entity.ToTable("AveragePer8HourShift");
			entity.HasKey(average => new
			{
				average.SampleId,
				average.ExposureType,
				average.Time,
			});
			entity.Property(average => average.ExposureType).HasConversion<string>();
			entity
				.HasOne(average => average.Sample)
				.WithMany(sample => sample.AveragesPer8HourShift)
				.HasForeignKey(average => average.SampleId);
		});

		modelBuilder.Entity<NoiseAverage>().HasIndex(average => average.SampleId);
		modelBuilder.Entity<DustAverage>().HasIndex(average => average.SampleId);
		modelBuilder.Entity<VibrationAverage>().HasIndex(average => average.SampleId);
		modelBuilder.Entity<AveragePer8HourShift>().HasIndex(average => average.SampleId);
	}
}
