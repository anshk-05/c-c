namespace ConRes.Api.Resources;

public interface ISharedFileStore
{
    string FileName { get; }
    Task<string> ReadContentAsync(CancellationToken cancellationToken = default);
    Task WriteContentAsync(string content, CancellationToken cancellationToken = default);
}
