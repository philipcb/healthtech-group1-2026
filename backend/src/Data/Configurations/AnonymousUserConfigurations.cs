using Backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configuration;

public class AnonymousUserConfiguration : IEntityTypeConfiguration<AnonymousUser>
{
	public void Configure(EntityTypeBuilder<AnonymousUser> builder)
	{
		builder.HasKey(u => u.Id);
	}
}
