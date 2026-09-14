using System;
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

    public static Guid HashGuidToGuid(Guid sourceGuid)
    {
        // Convert source GUID to its 16-byte array representation
        byte[] sourceBytes = sourceGuid.ToByteArray();

        // Use MD5 to get a 16-byte hash output
        using (MD5 md5 = MD5.Create())
        {
            byte[] hashBytes = md5.ComputeHash(sourceBytes);

            // Return the new deterministic GUID
            return new Guid(hashBytes);
        }
    }
}