using ConRes.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ConRes.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().HasData(
            new User { Id = 1, Username = "aarav", DisplayName = "Aarav Patel" },
            new User { Id = 2, Username = "isha", DisplayName = "Isha Sharma" },
            new User { Id = 3, Username = "dev", DisplayName = "Dev Kumar" },
            new User { Id = 4, Username = "maya", DisplayName = "Maya Singh" },
            new User { Id = 5, Username = "rohan", DisplayName = "Rohan Mehta" },
            new User { Id = 6, Username = "anika", DisplayName = "Anika Nair" }
        );
    }
}