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

    public async Task<(bool Success, string Message, string? Content)> ReadFileAsync(int userId)
    {
        if (!IsUserActive(userId))
        {
            return (false, "User must be logged in to read the file.", null);
        }

        // Acquire reader entry: first reader blocks writers by taking _gate.
        if (!await _readerCountLock.WaitAsync(TimeSpan.FromSeconds(30)))
            return (false, "Could not acquire read lock.", null);

        try
        {
            if (_readerCount == 0)
            {
                if (!await _gate.WaitAsync(TimeSpan.FromSeconds(30)))
                {
                    return (false, "Could not acquire read lock (writer active).", null);
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
            await Task.Delay(3000);
            var content = await File.ReadAllTextAsync(_filePath);
            return (true, "File read successful.", content);
        }
        finally
        {
            lock (_trackingLock) { _readingUserIds.Remove(userId); }

            // Last reader releases _gate so writers can proceed.
            await _readerCountLock.WaitAsync();
            _readerCount--;
            if (_readerCount == 0)
                _gate.Release();
            _readerCountLock.Release();
        }
    }

    public async Task<(bool Success, string Message)> WriteFileAsync(int userId, string content)
    {
        if (!IsUserActive(userId))
        {
            return (false, "User must be logged in to write to the file.");
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            return (false, "Content is required.");
        }

        if (!await _gate.WaitAsync(TimeSpan.FromSeconds(30)))
            return (false, "Could not acquire write lock.");

        lock (_trackingLock) { _writingUserId = userId; }

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
