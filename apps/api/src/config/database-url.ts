const AZURE_POSTGRES_HOST_SUFFIXES = [
  {
    privateLink: '.privatelink.postgres.database.azure.com',
    canonical: '.postgres.database.azure.com',
  },
  {
    privateLink: '.privatelink.postgres.database.chinacloudapi.cn',
    canonical: '.postgres.database.chinacloudapi.cn',
  },
] as const;

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
    const suffixes = AZURE_POSTGRES_HOST_SUFFIXES.find(({ privateLink }) =>
      hostname.endsWith(privateLink),
    );
    if (!suffixes) {
      return databaseUrl;
    }

    const serverName = hostname.slice(0, -suffixes.privateLink.length);
    if (!serverName) {
      return databaseUrl;
    }

    url.hostname = `${serverName}${suffixes.canonical}`;
    return url.toString();
  } catch {
    // Keep existing validation behaviour for malformed URLs. The database
    // client will report its usual connection-string error if one is supplied.
    return databaseUrl;
  }
}
