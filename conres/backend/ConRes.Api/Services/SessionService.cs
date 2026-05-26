using System.Collections.Concurrent;
using ConRes.Api.Data;
using ConRes.Api.Dtos;
using ConRes.Api.Models;

namespace ConRes.Api.Services;

public class SessionService
{
    private const int MaxConcurrentUsers = 4;

    private readonly IUserRepository _userRepository;
    private readonly IRealtimeEventPublisher _realtimeEvents;
    private readonly ConcurrentDictionary<int, UserSession> _userSessions = new();
    private readonly ConcurrentDictionary<int, SessionInfo> _activeSessions = new();
    private readonly SemaphoreSlim _loginSemaphore = new(MaxConcurrentUsers, MaxConcurrentUsers);
    private FileService? _fileService;

    private readonly object _queueLock = new();
    private readonly Queue<int> _waitingQueue = new();
    private readonly HashSet<int> _waitingUserIds = new();

    public SessionService(IUserRepository userRepository, IRealtimeEventPublisher realtimeEvents)
    {
        _userRepository = userRepository;
        _realtimeEvents = realtimeEvents;
    }

    public void SetFileService(FileService fileService) => _fileService = fileService;

    public async Task<(bool Success, bool Queued, string Message, SessionInfo? Session)> LoginAsync(
        int userId,
        string username,
        string password)
    {
        if (userId <= 0)
        {
            return (false, false, "User ID is required.", null);
        }

        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, false, "Username is required.", null);
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            return (false, false, "Password is required.", null);
        }

        var normalizedUsername = username.Trim().ToLowerInvariant();
        var passwordValue = password.Trim();

        var user = await _userRepository.GetByCredentialsAsync(userId, normalizedUsername, passwordValue);

        if (user is null)
        {
            return (false, false, "User credentials do not match any registered user.", null);
        }

        if (_userSessions.TryGetValue(user.Id, out var existingSession))
        {
            // This prevents the same user from creating duplicate active or queued sessions.
            return existingSession.State switch
            {
                UserSessionState.Active => (false, false, "User is already logged in.", null),
                UserSessionState.Waiting => (false, true, "User is already in the waiting queue.", null),
                _ => (false, false, "User already has a session in progress.", null)
            };
        }

        var userSession = new UserSession(
            user,
            _loginSemaphore,
            MarkUserAsWaiting,
            RemoveWaitingUser,
            MarkUserAsActive,
            CompleteSession);

        if (!_userSessions.TryAdd(user.Id, userSession))
        {
            return (false, false, "Could not create session.", null);
        }

        var startResult = await userSession.StartAsync();

        if (!startResult.Success && !startResult.Queued)
        {
            _userSessions.TryRemove(user.Id, out _);
        }

        return (startResult.Success, startResult.Queued, startResult.Message, startResult.Session);
    }
    
    public bool Logout(int userId)
    {
        if (!_userSessions.TryGetValue(userId, out var userSession))
            return false;

        return userSession.RequestLogout();
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

    private void MarkUserAsWaiting(int userId)
    {
        lock (_queueLock)
        {
            // The HashSet blocks duplicates while the Queue preserves FIFO ordering.
            if (_waitingUserIds.Add(userId))
            {
                _waitingQueue.Enqueue(userId);
            }
        }

        PublishSessionStateChanged("session-waiting");
    }

    private void RemoveWaitingUser(int userId)
    {
        lock (_queueLock)
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

    private void MarkUserAsActive(SessionInfo session)
    {
        RemoveWaitingUser(session.UserId);
        _activeSessions[session.UserId] = session;
        PublishSessionStateChanged("session-active");
    }

    private void CompleteSession(int userId)
    {
        // Any queued file requests are cleared here so stale entries do not remain after logout.
        _fileService?.CancelQueuedRequests(userId);
        _activeSessions.TryRemove(userId, out _);
        RemoveWaitingUser(userId);
        _userSessions.TryRemove(userId, out _);
        PublishSessionStateChanged("session-ended");
    }

    private void PublishSessionStateChanged(string reason)
    {
        _ = _realtimeEvents.PublishSessionStateChangedAsync(new SessionStateChangedResponse
        {
            Reason = reason,
            OccurredAtUtc = DateTime.UtcNow,
            ActiveUserIds = GetActiveSessions()
                .Select(s => s.UserId)
                .ToList(),
            WaitingUserIds = GetWaitingUserIds().ToList(),
            MaxConcurrentUsers = GetMaxConcurrentUsers(),
            AvailableSlots = GetAvailableSlots()
        });

        _ = _realtimeEvents.PublishSystemStatusChangedAsync(reason);
    }
}
