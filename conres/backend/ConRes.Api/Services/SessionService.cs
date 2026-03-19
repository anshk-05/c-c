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

    public async Task<(bool Success, bool Queued, string Message, SessionInfo? Session)> LoginAsync(int userId, string username)
    {
        if (userId <= 0)
        {
            return (false, false, "User ID is required.", null);
        }

        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, false, "Username is required.", null);
        }

        var normalizedUsername = username.Trim().ToLowerInvariant();

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();

        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId && u.Username.ToLower() == normalizedUsername);

        if (user is null)
        {
            return (false, false, "User ID and username do not match any registered user.", null);
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

        var session = CreateSession(user);

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
            return false;

        _loginSemaphore.Release();

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

    public async Task<SessionInfo?> TryPromoteNextWaitingUserAsync()
    {
        int? nextUserId;

        lock (_queueLock)
        {
            nextUserId = PeekNextWaitingUserIdUnsafe();
        }

        if (!nextUserId.HasValue)
        {
            return null;
        }

        var entered = await _loginSemaphore.WaitAsync(0);

        if (!entered)
        {
            return null;
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync();
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == nextUserId.Value);

        if (user is null)
        {
            lock (_queueLock)
            {
                RemoveWaitingUserUnsafe(nextUserId.Value);
            }

            _loginSemaphore.Release();
            return null;
        }

        var session = CreateSession(user);

        if (!_activeSessions.TryAdd(user.Id, session))
        {
            _loginSemaphore.Release();

            lock (_queueLock)
            {
                if (_activeSessions.ContainsKey(user.Id))
                {
                    RemoveWaitingUserUnsafe(user.Id);
                }
            }

            return null;
        }

        lock (_queueLock)
        {
            RemoveWaitingUserUnsafe(user.Id);
        }

        return session;
    }

    private static SessionInfo CreateSession(User user)
    {
        return new SessionInfo
        {
            UserId = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            LoginTimeUtc = DateTime.UtcNow
        };
    }

    private int? PeekNextWaitingUserIdUnsafe()
    {
        while (_waitingQueue.Count > 0)
        {
            var nextUserId = _waitingQueue.Peek();

            if (_waitingUserIds.Contains(nextUserId))
            {
                return nextUserId;
            }

            _waitingQueue.Dequeue();
        }

        return null;
    }

    private void RemoveWaitingUserUnsafe(int userId)
    {
        if (!_waitingUserIds.Remove(userId))
        {
            return;
        }

        var reorderedQueue = new Queue<int>();

        while (_waitingQueue.Count > 0)
        {
            var queuedUserId = _waitingQueue.Dequeue();

            if (queuedUserId != userId)
            {
                reorderedQueue.Enqueue(queuedUserId);
            }
        }

        while (reorderedQueue.Count > 0)
        {
            _waitingQueue.Enqueue(reorderedQueue.Dequeue());
        }
    }
}
