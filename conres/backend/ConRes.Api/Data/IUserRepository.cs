using ConRes.Api.Models;

namespace ConRes.Api.Data;

public interface IUserRepository
{
    Task<User?> GetByIdAndUsernameAsync(int userId, string normalizedUsername);
    Task<IReadOnlyList<User>> GetAllAsync();
}
