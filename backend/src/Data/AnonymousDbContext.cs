using Backend.Models;
using Backend.Records;
using Microsoft.EntityFrameworkCore;

public class AnonymousDbContext : DbContext
{
	public AnonymousDbContext(DbContextOptions<AnonymousDbContext> options)
		: base(options) { }

	public DbSet<AnonymousNoiseData> NoiseData { get; set; }
	public DbSet<AnonymousDustData> DustData { get; set; }
	public DbSet<AnonymousVibrationData> VibrationData { get; set; }
	
	public DbSet<AnonymousUser> User { get; set; }
	public DbSet<AnonymousLocation> Location { get; set; }

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);
		modelBuilder.ApplyConfiguration(new Backend.Data.Configuration.AnonymousUserConfiguration());

		modelBuilder
			.Entity<AnonymousUser>()
			.HasMany(user => user.Managers)
			.WithMany(user => user.Subordinates)
			.UsingEntity(typeBuilder => typeBuilder.ToTable("UserManagers"));

		// Store UserRole enum as string
		modelBuilder.Entity<AnonymousUser>().Property(user => user.Role).HasConversion<string>();

		modelBuilder.Entity<AnonymousVibrationData>(entity =>
		{
			entity
				.HasOne(v => v.User)
				.WithMany(u => u.VibrationData)
				.HasForeignKey(v => v.UserId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(v => new { v.UserId, v.ConnectedOn });
		});

		modelBuilder.Entity<AnonymousNoiseData>(entity =>
		{
			entity
				.HasOne(n => n.User)
				.WithMany(u => u.NoiseData)
				.HasForeignKey(n => n.UserId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(n => new { n.UserId, n.Time });
		});

		modelBuilder.Entity<AnonymousDustData>(entity =>
		{
			entity
				.HasOne(d => d.User)
				.WithMany(u => u.DustData)
				.HasForeignKey(d => d.UserId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(d => new { d.UserId, d.Time });
		});
	}
}
