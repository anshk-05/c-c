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
            new User { Id = 1, Username = "gojo", DisplayName = "Satoru Gojo" },
            new User { Id = 2, Username = "sukuna", DisplayName = "Ryomen Sukuna" },
            new User { Id = 3, Username = "itadori", DisplayName = "Yuji Itadori" },
            new User { Id = 4, Username = "nobara", DisplayName = "Nobara Kugisaki" },
            new User { Id = 5, Username = "todo", DisplayName = "Aoi Todo" },
            new User { Id = 6, Username = "toji", DisplayName = "Toji Fushiguro" }
        );
    }
}