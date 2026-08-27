const AZURE_POSTGRES_PRIVATE_LINK_SUFFIX = '.privatelink.postgres.database.azure.com';
const AZURE_POSTGRES_SUFFIX = '.postgres.database.azure.com';

/**
 * Azure PostgreSQL certificates are issued for the public server FQDN, even
 * when the server is reached through a Private Endpoint. The public FQDN is
 * resolved to the private IP by Azure Private DNS, so it must remain the host
 * used in the connection string for TLS hostname validation to succeed.
 */
export function normalizeDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      return databaseUrl;
    }

    const hostname = url.hostname.replace(/\.$/, '').toLowerCase();
    if (!hostname.endsWith(AZURE_POSTGRES_PRIVATE_LINK_SUFFIX)) {
      return databaseUrl;
    }

    const serverName = hostname.slice(0, -AZURE_POSTGRES_PRIVATE_LINK_SUFFIX.length);
    if (!serverName) {
      return databaseUrl;
    }

    url.hostname = `${serverName}${AZURE_POSTGRES_SUFFIX}`;
    return url.toString();
  } catch {
    // Keep existing validation behaviour for malformed URLs. The database
    // client will report its usual connection-string error if one is supplied.
    return databaseUrl;
  }
}
