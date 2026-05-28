using ConRes.Api.Models;

namespace ConRes.Api.Services;

public enum UserSessionState
{
    Created,
    Waiting,
    Active,
    LoggedOut
}

public sealed class UserSessionStartResult
{
    public bool Success { get; init; }
    public bool Queued { get; init; }
    public string Message { get; init; } = string.Empty;
    public SessionInfo? Session { get; init; }
}

public sealed class UserSession
{
    private readonly User _user;
    private readonly SemaphoreSlim _loginSemaphore;
    private readonly Action<int> _markWaiting;
    private readonly Action<int> _removeWaiting;
    private readonly Action<SessionInfo> _markActive;
    private readonly Action<int> _completeSession;

    private readonly object _stateLock = new();
    private readonly TaskCompletionSource<UserSessionStartResult> _startResultSource =
        new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly TaskCompletionSource _logoutSignal =
        new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly CancellationTokenSource _waitingCancellation = new();

    private UserSessionState _state = UserSessionState.Created;
    private bool _holdsPermit;
    private Task? _executionTask;

    public UserSession(
        User user,
        SemaphoreSlim loginSemaphore,
        Action<int> markWaiting,
        Action<int> removeWaiting,
        Action<SessionInfo> markActive,
        Action<int> completeSession)
    {
        _user = user;
        _loginSemaphore = loginSemaphore;
        _markWaiting = markWaiting;
        _removeWaiting = removeWaiting;
        _markActive = markActive;
        _completeSession = completeSession;
    }

    public UserSessionState State
    {
        get
        {
            lock (_stateLock)
            {
                return _state;
            }
        }
    }

    public Task<UserSessionStartResult> StartAsync()
    {
        lock (_stateLock)
        {
            if (_executionTask is null)
            {
                // The session workflow starts once, and every caller then awaits the same result task.
                _executionTask = Task.Run(RunAsync);
            }
        }

        return _startResultSource.Task;
    }

    public bool RequestLogout()
    {
        lock (_stateLock)
        {
            if (_state == UserSessionState.LoggedOut)
            {
                return false;
            }

            if (_state == UserSessionState.Active)
            {
                _logoutSignal.TrySetResult();
            }
            else
            {
                _waitingCancellation.Cancel();
            }

            return true;
        }
    }

    private async Task RunAsync()
    {
        try
        {
            if (!_loginSemaphore.Wait(0))
            {
                // No permit means the user is valid, but must wait for one of the 4 active slots to open.
                SetState(UserSessionState.Waiting);
                _markWaiting(_user.Id);

                _startResultSource.TrySetResult(new UserSessionStartResult
                {
                    Success = false,
                    Queued = true,
                    Message = "No slot available. User added to waiting queue."
                });

                await _loginSemaphore.WaitAsync(_waitingCancellation.Token);
            }

            if (_waitingCancellation.IsCancellationRequested)
            {
                return;
            }

            _holdsPermit = true;
            _removeWaiting(_user.Id);

            // Once a permit is acquired, the user moves from queued to active.
            var sessionInfo = CreateSessionInfo();
            SetState(UserSessionState.Active);
            _markActive(sessionInfo);

            _startResultSource.TrySetResult(new UserSessionStartResult
            {
                Success = true,
                Queued = false,
                Message = "Login successful.",
                Session = sessionInfo
            });

            await _logoutSignal.Task;
        }
        catch (Exception ex)
        {
            _startResultSource.TrySetResult(new UserSessionStartResult
            {
                Success = false,
                Queued = false,
                Message = $"Session failed: {ex.Message}"
            });
        }
        finally
        {
            Cleanup();
        }
    }

    private void Cleanup()
    {
        _removeWaiting(_user.Id);
        SetState(UserSessionState.LoggedOut);

        if (_holdsPermit)
        {
            _holdsPermit = false;
            // Releasing the semaphore here ensures the other users can log on.
            _loginSemaphore.Release();
        }

        _completeSession(_user.Id);
    }

    private SessionInfo CreateSessionInfo()
    {
        return new SessionInfo
        {
            UserId = _user.Id,
            Username = _user.Username,
            DisplayName = _user.DisplayName,
            LoginTimeUtc = DateTime.UtcNow
        };
    }

    private void SetState(UserSessionState state)
    {
        lock (_stateLock)
        {
            _state = state;
        }
    }
}
