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
            new User { Id = 1, Username = "gojo", Password = "gojopass", DisplayName = "Satoru Gojo" },
            new User { Id = 2, Username = "sukuna", Password = "sukunapass", DisplayName = "Ryomen Sukuna" },
            new User { Id = 3, Username = "itadori", Password = "itadoripass", DisplayName = "Yuji Itadori" },
            new User { Id = 4, Username = "nobara", Password = "nobarapass", DisplayName = "Nobara Kugisaki" },
            new User { Id = 5, Username = "todo", Password = "todopass", DisplayName = "Aoi Todo" },
            new User { Id = 6, Username = "toji", Password = "tojipass", DisplayName = "Toji Fushiguro" }
        );
    }
}
