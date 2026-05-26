using ConRes.Api.Models;

namespace ConRes.Api.Resources;

public class SharedFileStore : ISharedFileStore
{
    private readonly string _filePath;
    private readonly object _metadataLock = new();
    private long _version = 1;
    private DateTime _lastUpdatedUtc;

    public SharedFileStore(IWebHostEnvironment environment)
    {
        FileName = "ProductSpecification.txt";
        _filePath = Path.Combine(environment.ContentRootPath, "SharedFiles", FileName);
        _lastUpdatedUtc = File.Exists(_filePath)
            ? File.GetLastWriteTimeUtc(_filePath)
            : DateTime.UtcNow;
    }

    public string FileName { get; }

    public Task<string> ReadContentAsync(CancellationToken cancellationToken = default)
    {
        return File.ReadAllTextAsync(_filePath, cancellationToken);
    }

    public async Task<SharedFileMetadata> WriteContentAsync(
        string content,
        CancellationToken cancellationToken = default)
    {
        await File.WriteAllTextAsync(_filePath, content, cancellationToken);

        lock (_metadataLock)
        {
            _version++;
            _lastUpdatedUtc = File.GetLastWriteTimeUtc(_filePath);
            return CreateMetadata();
        }
    }

    public SharedFileMetadata GetMetadata()
    {
        lock (_metadataLock)
        {
            return CreateMetadata();
        }
    }

    private SharedFileMetadata CreateMetadata()
    {
        return new SharedFileMetadata
        {
            FileName = FileName,
            Version = _version,
            LastUpdatedUtc = _lastUpdatedUtc
        };
    }
}
