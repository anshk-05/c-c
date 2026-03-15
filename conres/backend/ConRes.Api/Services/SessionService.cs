using System.Collections.Concurrent;
using ConRes.Api.Data;
using ConRes.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ConRes.Api.Services;

public class SessionService
{
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly ConcurrentDictionary<int, SessionInfo> _activeSessions = new();

    public SessionService(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
    }

    public async Task<(bool Success, string Message, SessionInfo? Session)> LoginAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, "Username is required.", null);
        }

        var normalizedUsername = username.Trim().ToLower();

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsername);

        if (user is null)
        {
            return (false, "User not found.", null);
        }

        if (_activeSessions.ContainsKey(user.Id))
        {
            return (false, "User is already logged in.", null);
        }

        var session = new SessionInfo
        {
            UserId = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            LoginTimeUtc = DateTime.UtcNow
        };

        var added = _activeSessions.TryAdd(user.Id, session);

        if (!added)
        {
            return (false, "Could not create session.", null);
        }

        return (true, "Login successful.", session);
    }

    public bool Logout(int userId)
    {
        return _activeSessions.TryRemove(userId, out _);
    }

    public IReadOnlyCollection<SessionInfo> GetActiveSessions()
    {
        return _activeSessions.Values
            .OrderBy(s => s.UserId)
            .ToList()
            .AsReadOnly();
    }
}