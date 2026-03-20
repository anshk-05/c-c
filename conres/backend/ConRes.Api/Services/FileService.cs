using ConRes.Api.Dtos;

namespace ConRes.Api.Services;

public class FileService
{
    private record WaitNode(int UserId, bool IsWrite, TaskCompletionSource<bool> Tcs);

    private readonly object _trackingLock = new();

    private readonly LinkedList<WaitNode> _queue = new();

    private readonly HashSet<int> _readingUserIds = new();
    private int _activeReaders = 0;
    private int? _writingUserId = null;

    private readonly string _filePath;
    private readonly string _fileName = "ProductSpecification.txt";
    private readonly SessionService _sessionService;

    public FileService(SessionService sessionService, IWebHostEnvironment environment)
    {
        _sessionService = sessionService;
        _filePath = Path.Combine(environment.ContentRootPath, "SharedFiles", _fileName);
    }

    public bool IsUserActive(int userId)
    {
        return _sessionService.GetActiveSessions().Any(s => s.UserId == userId);
    }

 
    public async Task<(bool Success, string Message, string? Content)> AcquireReadAsync(
        int userId, CancellationToken ct = default)
    {
        if (!IsUserActive(userId))
            return (false, "User must be logged in to read the file.", null);

        LinkedListNode<WaitNode>? listNode = null;
        TaskCompletionSource<bool>? tcs = null;

        lock (_trackingLock)
        {
            if (_readingUserIds.Contains(userId))
                return (false, "User is already reading.", null);


            bool writerWaiting = _queue.Any(n => n.IsWrite);
            if (_writingUserId == null && !writerWaiting)
            {
                _activeReaders++;
                _readingUserIds.Add(userId);
            }
            else
            {
                tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                listNode = _queue.AddLast(new WaitNode(userId, IsWrite: false, tcs));
            }
        }

        if (tcs != null)
        {

            var reg = ct.Register(() =>
            {
                lock (_trackingLock)
                {
                    if (listNode!.List != null)
                        _queue.Remove(listNode);
                }
                tcs.TrySetCanceled(ct);
            });

            try
            {
                await tcs.Task;
            }
            catch (OperationCanceledException)
            {
                return (false, "Read request was cancelled.", null);
            }
            finally
            {
                reg.Dispose();
            }

            bool acquired;
            lock (_trackingLock) { acquired = _readingUserIds.Contains(userId); }
            if (!acquired)
                return (false, "Read request was cancelled — session ended.", null);
        }

        try
        {
            var content = await File.ReadAllTextAsync(_filePath, ct);
            return (true, "File read successful.", content);
        }
        catch (OperationCanceledException)
        {
            await ReleaseReadAsync(userId);
            return (false, "Read was cancelled.", null);
        }
        catch
        {
            await ReleaseReadAsync(userId);
            throw;
        }
    }

    public Task<(bool Success, string Message)> ReleaseReadAsync(int userId)
    {
        lock (_trackingLock)
        {
            if (!_readingUserIds.Remove(userId))
                return Task.FromResult((false, "User is not currently reading."));

            _activeReaders--;
            if (_activeReaders == 0)
                TryPromoteNext();
        }

        return Task.FromResult((true, "Read lock released."));
    }

    public async Task<(bool Success, string Message)> AcquireWriteLockAsync(
        int userId, CancellationToken ct = default)
    {
        if (!IsUserActive(userId))
            return (false, "User must be logged in to write the file.");

        LinkedListNode<WaitNode>? listNode = null;
        TaskCompletionSource<bool>? tcs = null;

        lock (_trackingLock)
        {
            if (_writingUserId == userId)
                return (false, "You are already holding the write lock.");

            if (_activeReaders == 0 && _writingUserId == null && _queue.Count == 0)
            {
                _writingUserId = userId;
            }
            else
            {
                tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                listNode = _queue.AddLast(new WaitNode(userId, IsWrite: true, tcs));
            }
        }

        if (tcs != null)
        {
            var reg = ct.Register(() =>
            {
                lock (_trackingLock)
                {
                    if (listNode!.List != null)
                        _queue.Remove(listNode);
                }
                tcs.TrySetCanceled(ct);
            });

            try
            {
                await tcs.Task;
            }
            catch (OperationCanceledException)
            {
                return (false, "Write request was cancelled.");
            }
            finally
            {
                reg.Dispose();
            }

            bool acquired;
            lock (_trackingLock) { acquired = _writingUserId == userId; }
            if (!acquired)
                return (false, "Write request was cancelled — session ended.");
        }

        return (true, "Write lock acquired.");
    }

    public Task<(bool Success, string Message)> ReleaseWriteLockAsync(int userId)
    {
        lock (_trackingLock)
        {
            if (_writingUserId != userId)
                return Task.FromResult((false, "You do not hold the write lock."));

            _writingUserId = null;
            TryPromoteNext();
        }

        return Task.FromResult((true, "Write lock released."));
    }

    public async Task<(bool Success, string Message)> WriteFileAsync(int userId, string content)
    {
        if (!IsUserActive(userId))
            return (false, "User must be logged in to write to the file.");

        if (string.IsNullOrWhiteSpace(content))
            return (false, "Content is required.");

        lock (_trackingLock)
        {
            if (_writingUserId != userId)
                return (false, "Write lock not held. Acquire the write lock first.");
        }

        try
        {
            await Task.Delay(5000);
            await File.WriteAllTextAsync(_filePath, content);
            return (true, "File write successful.");
        }
        finally
        {
            lock (_trackingLock)
            {
                _writingUserId = null;
                TryPromoteNext();
            }
        }
    }

    private void TryPromoteNext()
    {
        while (_queue.First != null)
        {
            var head = _queue.First.Value;

            if (!IsUserActive(head.UserId))
            {
                _queue.RemoveFirst();
                head.Tcs.TrySetResult(false);
                continue;
            }

            if (head.IsWrite)
            {
                if (_activeReaders == 0 && _writingUserId == null)
                {
                    _queue.RemoveFirst();
                    _writingUserId = head.UserId;
                    head.Tcs.TrySetResult(true);
                }
                break;
            }
            else
            {
                if (_writingUserId == null)
                {
                    _queue.RemoveFirst();
                    _activeReaders++;
                    _readingUserIds.Add(head.UserId);
                    head.Tcs.TrySetResult(true);
                }
                else
                {
                    break;
                }
            }
        }
    }

    public void CancelQueuedRequests(int userId)
    {
        var toCancel = new List<TaskCompletionSource<bool>>();

        lock (_trackingLock)
        {
            var node = _queue.First;
            while (node != null)
            {
                var next = node.Next;
                if (node.Value.UserId == userId)
                {
                    toCancel.Add(node.Value.Tcs);
                    _queue.Remove(node);
                }
                node = next;
            }
        }

        foreach (var tcs in toCancel)
            tcs.TrySetCanceled();
    }

    public FileAccessStatusResponse GetFileAccessStatus()
    {
        lock (_trackingLock)
        {
            var queue = _queue
                .Select((n, i) => new QueuedRequest
                {
                    UserId = n.UserId,
                    IsWrite = n.IsWrite,
                    Position = i + 1
                })
                .ToList();

            return new FileAccessStatusResponse
            {
                FileName = _fileName,
                ReadingUserIds = _readingUserIds.OrderBy(id => id).ToList(),
                WritingUserId = _writingUserId,
                Queue = queue
            };
        }
    }
}
