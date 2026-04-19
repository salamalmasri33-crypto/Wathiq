using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Application.Interfaces.Security;
using eArchiveSystem.Application.Interfaces.Services;
using eArchiveSystem.Application.Services;
using eArchiveSystem.Domain.Models;
using Microsoft.Extensions.Configuration;

namespace eArchiveSystem.Tests;

public class UserServiceTests
{
    [Fact]
    public async Task Login_WithValidCredentialsWithoutTwoFactor_ReturnsTokenAndResetsLockoutState()
    {
        var user = CreateUser(
            email: "login-success@example.com",
            hashedPassword: "hash::Password@123",
            failedAttempts: 2,
            lockoutUntil: DateTime.UtcNow.AddMinutes(-5));

        var repository = new FakeUserRepository(user);
        var tokenService = new FakeTokenService();
        var auditService = new FakeAuditService();
        var service = CreateService(repository, tokenService: tokenService, auditService: auditService);

        var result = await service.Login(new LoginDto
        {
            Email = user.Email,
            Password = "Password@123"
        });

        Assert.False(result.Requires2FA);
        Assert.Equal("token-for-login-success@example.com", result.Token);
        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.Null(user.LockoutUntil);
        Assert.Contains(auditService.Entries, entry => entry.Action == "LoginSuccess");
    }

    [Fact]
    public async Task Login_OnThirdInvalidPassword_AttemptLocksTheAccount()
    {
        var user = CreateUser(
            email: "lockout@example.com",
            hashedPassword: "hash::CorrectPassword123!",
            failedAttempts: 2);

        var repository = new FakeUserRepository(user);
        var auditService = new FakeAuditService();
        var service = CreateService(repository, auditService: auditService);

        var exception = await Assert.ThrowsAsync<Exception>(() => service.Login(new LoginDto
        {
            Email = user.Email,
            Password = "WrongPassword123!"
        }));

        Assert.Equal("Invalid email or password", exception.Message);
        Assert.Equal(3, user.FailedLoginAttempts);
        Assert.NotNull(user.LockoutUntil);
        Assert.Contains(auditService.Entries, entry => entry.Action == "AccountLocked");
        Assert.Contains(auditService.Entries, entry => entry.Action == "LoginFailed");
    }

    [Fact]
    public async Task Login_WithTwoFactorEnabled_SendsCodeAndReturnsPendingVerification()
    {
        var user = CreateUser(
            email: "twofactor@example.com",
            hashedPassword: "hash::Password@123",
            twoFactorEnabled: true);

        var repository = new FakeUserRepository(user);
        var emailService = new FakeEmailService();
        var auditService = new FakeAuditService();
        var service = CreateService(repository, emailService: emailService, auditService: auditService);

        var result = await service.Login(new LoginDto
        {
            Email = user.Email,
            Password = "Password@123"
        });

        Assert.True(result.Requires2FA);
        Assert.Equal("Verification code sent to your email.", result.Message);
        Assert.NotNull(user.TwoFactorCode);
        Assert.Equal(6, user.TwoFactorCode!.Length);
        Assert.Single(emailService.SentMessages);
        Assert.Contains(auditService.Entries, entry => entry.Action == "2FACodeSent");
    }

    [Fact]
    public async Task VerifyTwoFactorAsync_WithValidCode_ClearsCodeAndReturnsToken()
    {
        var user = CreateUser(
            email: "verify-2fa@example.com",
            hashedPassword: "hash::Password@123",
            twoFactorEnabled: true);
        user.TwoFactorCode = "123456";
        user.TwoFactorExpiry = DateTime.UtcNow.AddMinutes(5);

        var repository = new FakeUserRepository(user);
        var tokenService = new FakeTokenService();
        var auditService = new FakeAuditService();
        var service = CreateService(repository, tokenService: tokenService, auditService: auditService);

        var result = await service.VerifyTwoFactorAsync(new Verify2FADto
        {
            Email = user.Email,
            Code = "123456"
        });

        Assert.False(result.Requires2FA);
        Assert.Equal("token-for-verify-2fa@example.com", result.Token);
        Assert.Null(user.TwoFactorCode);
        Assert.Null(user.TwoFactorExpiry);
        Assert.Contains(auditService.Entries, entry => entry.Action == "Login2FASuccess");
    }

    private static UserService CreateService(
        FakeUserRepository repository,
        FakePasswordHasher? passwordHasher = null,
        FakeTokenService? tokenService = null,
        FakeEmailService? emailService = null,
        FakeAuditService? auditService = null)
    {
        var config = new ConfigurationBuilder().Build();

        return new UserService(
            repository,
            passwordHasher ?? new FakePasswordHasher(),
            tokenService ?? new FakeTokenService(),
            emailService ?? new FakeEmailService(),
            config,
            auditService ?? new FakeAuditService());
    }

    private static User CreateUser(
        string email,
        string hashedPassword,
        int failedAttempts = 0,
        DateTime? lockoutUntil = null,
        bool twoFactorEnabled = false)
    {
        return new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = "Unit Test User",
            Email = email,
            Password = hashedPassword,
            Role = "User",
            Department = "IT",
            FailedLoginAttempts = failedAttempts,
            LockoutUntil = lockoutUntil,
            TwoFactorEnabled = twoFactorEnabled
        };
    }

    private sealed class FakeUserRepository : IUserRepository
    {
        private readonly List<User> _users;

        public FakeUserRepository(params User[] users)
        {
            _users = users.ToList();
        }

        public Task<User> GetByEmailAsync(string email) =>
            Task.FromResult(_users.FirstOrDefault(user => user.Email == email)!);

        public Task CreateAsync(User user)
        {
            _users.Add(user);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(string id, User user)
        {
            var index = _users.FindIndex(existing => existing.Id == id);
            if (index >= 0)
            {
                _users[index] = user;
            }

            return Task.CompletedTask;
        }

        public Task DeleteAsync(string id)
        {
            _users.RemoveAll(user => user.Id == id);
            return Task.CompletedTask;
        }

        public Task<List<User>> GetAllAsync() => Task.FromResult(_users.ToList());

        public Task<User> GetByIdAsync(string id) =>
            Task.FromResult(_users.FirstOrDefault(user => user.Id == id)!);

        public Task<User> GetByResetToken(string token) =>
            Task.FromResult(_users.FirstOrDefault(user => user.ResetCode == token)!);

        public Task<List<User>> GetByRoleAsync(string role) =>
            Task.FromResult(_users.Where(user => user.Role == role).ToList());

        public Task<List<User>> GetByIdsAsync(List<string> ids) =>
            Task.FromResult(_users.Where(user => ids.Contains(user.Id)).ToList());
    }

    private sealed class FakePasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => $"hash::{password}";

        public bool Verify(string password, string hashedPassword) =>
            hashedPassword == Hash(password);
    }

    private sealed class FakeTokenService : ITokenService
    {
        public string GenerateJwtToken(User user) => $"token-for-{user.Email}";
    }

    private sealed class FakeEmailService : IEmailService
    {
        public List<(string To, string Subject, string Body)> SentMessages { get; } = [];

        public Task SendEmailAsync(string to, string subject, string body)
        {
            SentMessages.Add((to, subject, body));
            return Task.CompletedTask;
        }
    }

    private sealed class FakeAuditService : IAuditService
    {
        public List<(string UserId, string Role, string Action, string? DocumentId, string Description)> Entries { get; } = [];

        public Task LogAsync(string userId, string role, string action, string? documentId, string description)
        {
            Entries.Add((userId, role, action, documentId, description));
            return Task.CompletedTask;
        }

        public Task<List<AuditLog>> GetAllAsync() => Task.FromResult(new List<AuditLog>());

        public Task<(List<AuditLog> Logs, long TotalCount)> GetFilteredAsync(
            string? userId,
            string? role,
            string? action,
            DateTime? from,
            DateTime? to,
            int page,
            int pageSize) =>
            Task.FromResult((new List<AuditLog>(), 0L));

        public Task<List<eArchiveSystem.Application.DTOs.AuditLogDto>> GetAllWithUsersAsync() =>
            Task.FromResult(new List<eArchiveSystem.Application.DTOs.AuditLogDto>());
    }
}
