using ConRes.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ConRes.Api.Data;

public class UserRepository : IUserRepository
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;

    public UserRepository(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
    }

    public async Task<User?> GetByIdAndUsernameAsync(int userId, string normalizedUsername)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        return await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId && u.Username.ToLower() == normalizedUsername);
    }

    public async Task<IReadOnlyList<User>> GetAllAsync()
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        return await dbContext.Users
            .OrderBy(u => u.Id)
            .ToListAsync();
    }
}
