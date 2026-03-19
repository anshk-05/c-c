using ConRes.Api.Dtos;
using ConRes.Api.Services;

namespace ConRes.Api.Services;

public class FileService
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly SemaphoreSlim _readerCountLock = new(1, 1);
    private int _readerCount = 0;

    private readonly object _trackingLock = new();
    private readonly HashSet<int> _readingUserIds = new();
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

    public async Task<(bool Success, string Message, string? Content)> AcquireReadAsync(int userId, CancellationToken ct = default)
    {
        if (!IsUserActive(userId))
            return (false, "User must be logged in to read the file.", null);

        bool alreadyReading;
        lock (_trackingLock) { alreadyReading = _readingUserIds.Contains(userId); }
        if (alreadyReading)
            return (false, "User is already reading.", null);

        await _readerCountLock.WaitAsync(ct);
        try
        {
            if (_readerCount == 0)
            {
                bool acquired = await _gate.WaitAsync(0); 
                if (!acquired)
                {
                    int? writerId;
                    lock (_trackingLock) { writerId = _writingUserId; }
                    string msg = writerId.HasValue
                        ? $"File is write-locked — user {writerId} is currently writing."
                        : "File is write-locked.";
                    return (false, msg, null);
                }
            }
            _readerCount++;
        }
        finally
        {
            _readerCountLock.Release();
        }

        lock (_trackingLock) { _readingUserIds.Add(userId); }

        try
        {
            var content = await File.ReadAllTextAsync(_filePath, ct);
            return (true, "File read successful.", content);
        }
        catch
        {
            await ReleaseReadAsync(userId);
            throw;
        }
    }

    public async Task<(bool Success, string Message)> AcquireWriteLockAsync(int userId)
    {
        if (!IsUserActive(userId))
            return (false, "User must be logged in to write the file.");

        lock (_trackingLock)
        {
            if (_writingUserId == userId)
                return (false, "You are already holding the write lock.");
            if (_writingUserId != null)
                return (false, $"File is write-locked — user {_writingUserId} is currently writing.");
        }

        bool acquired = await _gate.WaitAsync(0); // non-blocking
        if (!acquired)
        {
            int count;
            lock (_trackingLock) { count = _readingUserIds.Count; }
            return (false, count > 0
                ? $"File is read-locked — {count} user(s) are currently reading. Wait for them to finish."
                : "File is currently locked.");
        }

        lock (_trackingLock) { _writingUserId = userId; }
        return (true, "Write lock acquired.");
    }

    public Task<(bool Success, string Message)> ReleaseWriteLockAsync(int userId)
    {
        lock (_trackingLock)
        {
            if (_writingUserId != userId)
                return Task.FromResult((false, "You do not hold the write lock."));
            _writingUserId = null;
        }
        _gate.Release();
        return Task.FromResult((true, "Write lock released."));
    }

    public async Task<(bool Success, string Message)> ReleaseReadAsync(int userId)
    {
        bool wasReading;
        lock (_trackingLock) { wasReading = _readingUserIds.Remove(userId); }

        if (!wasReading)
            return (false, "User is not currently reading.");

        await _readerCountLock.WaitAsync();
        _readerCount--;
        if (_readerCount == 0)
            _gate.Release();
        _readerCountLock.Release();

        return (true, "Read lock released.");
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
            lock (_trackingLock) { _writingUserId = null; }
            _gate.Release();
        }
    }

    public FileAccessStatusResponse GetFileAccessStatus()
    {
        lock (_trackingLock)
        {
            return new FileAccessStatusResponse
            {
                FileName = _fileName,
                ReadingUserIds = _readingUserIds.OrderBy(id => id).ToList(),
                WritingUserId = _writingUserId
            };
        }
    }
}
