using ConRes.Api.Models;

namespace ConRes.Api.Data;

public interface IUserRepository
{
    Task<User?> GetByCredentialsAsync(int userId, string normalizedUsername, string password);
    Task<IReadOnlyList<User>> GetAllAsync();
}
