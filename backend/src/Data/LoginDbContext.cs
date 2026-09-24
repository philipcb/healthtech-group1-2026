using Backend.Models;
using Backend.Records;
using Microsoft.EntityFrameworkCore;

public class LoginDbContext : DbContext
{
	public LoginDbContext(DbContextOptions<LoginDbContext> options)
		: base(options) { }

	public DbSet<UserInfo> User { get; set; }
	
	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);
		modelBuilder.ApplyConfiguration(new Backend.Data.Configuration.UserInfoConfiguration());


		// Store UserRole enum as string
		modelBuilder.Entity<UserInfo>().Property(user => user.Role).HasConversion<string>();

	}
}
