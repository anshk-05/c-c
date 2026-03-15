using System.Collections.Concurrent;
using ConRes.Api.Data;
using ConRes.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ConRes.Api.Services;

public class SessionService
{
    private const int MaxConcurrentUsers = 4;

    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly ConcurrentDictionary<int, SessionInfo> _activeSessions = new();
    private readonly SemaphoreSlim _loginSemaphore = new(MaxConcurrentUsers, MaxConcurrentUsers);

    private readonly object _queueLock = new();
    private readonly Queue<int> _waitingQueue = new();
    private readonly HashSet<int> _waitingUserIds = new();

    public SessionService(IDbContextFactory<AppDbContext> dbContextFactory)
    {
        _dbContextFactory = dbContextFactory;
    }

    public async Task<(bool Success, bool Queued, string Message, SessionInfo? Session)> LoginAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, false, "Username is required.", null);
        }

        var normalizedUsername = username.Trim().ToLowerInvariant();

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsername);

        if (user is null)
        {
            return (false, false, "User not found.", null);
        }

        if (_activeSessions.ContainsKey(user.Id))
        {
            return (false, false, "User is already logged in.", null);
        }

        lock (_queueLock)
        {
            if (_waitingUserIds.Contains(user.Id))
            {
                return (false, true, "User is already in the waiting queue.", null);
            }
        }

        var entered = await _loginSemaphore.WaitAsync(0);

        if (!entered)
        {
            lock (_queueLock)
            {
                if (_waitingUserIds.Add(user.Id))
                {
                    _waitingQueue.Enqueue(user.Id);
                }
            }

            return (false, true, "No slot available. User added to waiting queue.", null);
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
            _loginSemaphore.Release();
            return (false, false, "Could not create session.", null);
        }

        return (true, false, "Login successful.", session);
    }

    public bool Logout(int userId)
    {
        var removed = _activeSessions.TryRemove(userId, out _);

        if (!removed)
        {
            return false;
        }

        _loginSemaphore.Release();

        lock (_queueLock)
        {
            _waitingUserIds.Remove(userId);
        }

        return true;
    }

    public IReadOnlyCollection<SessionInfo> GetActiveSessions()
    {
        return _activeSessions.Values
            .OrderBy(s => s.UserId)
            .ToList()
            .AsReadOnly();
    }

    public IReadOnlyCollection<int> GetWaitingUserIds()
    {
        lock (_queueLock)
        {
            return _waitingQueue.ToList().AsReadOnly();
        }
    }

    public int GetAvailableSlots()
    {
        return _loginSemaphore.CurrentCount;
    }

    public int GetMaxConcurrentUsers()
    {
        return MaxConcurrentUsers;
    }

    public bool TryPromoteNextWaitingUser()
    {
        lock (_queueLock)
        {
            while (_waitingQueue.Count > 0)
            {
                var nextUserId = _waitingQueue.Dequeue();

                if (_waitingUserIds.Remove(nextUserId))
                {
                    return true;
                }
            }
        }

        return false;
    }
}