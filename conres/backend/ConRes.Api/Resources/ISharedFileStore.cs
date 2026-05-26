using ConRes.Api.Models;

namespace ConRes.Api.Resources;

public interface ISharedFileStore
{
    string FileName { get; }
    Task<string> ReadContentAsync(CancellationToken cancellationToken = default);
    Task<SharedFileMetadata> WriteContentAsync(string content, CancellationToken cancellationToken = default);
    SharedFileMetadata GetMetadata();
}
