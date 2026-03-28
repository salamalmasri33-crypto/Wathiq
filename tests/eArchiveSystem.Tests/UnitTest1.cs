using eArchiveSystem.Infrastructure.Security;
using eArchiveSystem.Utils;

namespace eArchiveSystem.Tests;

public class ServiceResultTests
{
    [Fact]
    public void Ok_ShouldSetSuccessToTrue_AndStoreData()
    {
        var result = ServiceResult<string>.Ok("document uploaded");

        Assert.True(result.Success);
        Assert.Equal("document uploaded", result.Data);
        Assert.Null(result.Message);
    }

    [Fact]
    public void Fail_ShouldSetSuccessToFalse_AndStoreMessage()
    {
        var result = ServiceResult<string>.Fail("duplicate file");

        Assert.False(result.Success);
        Assert.Equal("duplicate file", result.Message);
    }
}

public class BCryptPasswordHasherTests
{
    [Fact]
    public void Hash_AndVerify_ShouldAcceptTheOriginalPassword()
    {
        var hasher = new BCryptPasswordHasher();
        var password = "Wathiq#2026";

        var hashedPassword = hasher.Hash(password);

        Assert.NotEqual(password, hashedPassword);
        Assert.True(hasher.Verify(password, hashedPassword));
    }

    [Fact]
    public void Verify_ShouldRejectDifferentPassword()
    {
        var hasher = new BCryptPasswordHasher();
        var hashedPassword = hasher.Hash("CorrectPassword123!");

        Assert.False(hasher.Verify("WrongPassword123!", hashedPassword));
    }
}
