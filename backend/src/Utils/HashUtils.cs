using System.Security.Cryptography;
using System.Text;

namespace Backend.Utils;

public static class HashUtils
{
    public static string HashGuid(Guid guid)
    {
        using SHA256 sha256 = SHA256.Create();
        byte[] bytes = sha256.ComputeHash(guid.ToByteArray());
        return BitConverter.ToString(bytes).Replace("-", "").ToLower();
    }
}