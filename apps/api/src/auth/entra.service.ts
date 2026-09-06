import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { UsersService } from '../users/users.service';

const SCOPES = ['openid', 'profile', 'email'];

export interface EntraAuthRequest {
  url: string;
  verifier: string;
  state: string;
  nonce: string;
}

/**
 * Drives the backend Authorization Code + PKCE flow against Microsoft Entra ID.
 * MSAL validates the id_token signature/issuer/audience/expiry during
 * acquireTokenByCode; we additionally assert the nonce and tenant id, then
 * provision/link the local user. SSO is inert unless fully configured.
 */
@Injectable()
export class EntraService {
  private readonly logger = new Logger(EntraService.name);
  private readonly cca: ConfidentialClientApplication | null = null;
  private readonly cryptoProvider = new CryptoProvider();
  private readonly tenantId?: string;
  private readonly redirectUri?: string;

  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const clientId = config.get<string>('ENTRA_CLIENT_ID') || undefined;
    const clientSecret = config.get<string>('ENTRA_CLIENT_SECRET') || undefined;
    this.tenantId = config.get<string>('ENTRA_TENANT_ID') || undefined;
    this.redirectUri = config.get<string>('ENTRA_REDIRECT_URI') || undefined;

    if (clientId && clientSecret && this.tenantId && this.redirectUri) {
      this.cca = new ConfidentialClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${this.tenantId}`,
          clientSecret,
        },
      });
      this.logger.log('Entra ID SSO is enabled');
    } else if (clientId) {
      this.logger.warn(
        'ENTRA_CLIENT_ID is set but ENTRA_CLIENT_SECRET / ENTRA_TENANT_ID / ENTRA_REDIRECT_URI are incomplete; SSO disabled.',
      );
    }
  }

  isEnabled(): boolean {
    return this.cca !== null;
  }

  private client(): ConfidentialClientApplication {
    if (!this.cca) throw new ServiceUnavailableException('Entra SSO is not configured');
    return this.cca;
  }

  /** Builds the Microsoft authorize URL and the per-request secrets to persist in the tx cookie. */
  async buildAuthCodeUrl(): Promise<EntraAuthRequest> {
    const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
    const state = this.cryptoProvider.createNewGuid();
    const nonce = this.cryptoProvider.createNewGuid();
    const url = await this.client().getAuthCodeUrl({
      scopes: SCOPES,
      redirectUri: this.redirectUri!,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      state,
      nonce,
      prompt: 'select_account',
    });
    return { url, verifier, state, nonce };
  }

  /** Exchanges the auth code, validates the token, then provisions/links the local user. */
  async handleCallback(code: string, verifier: string, expectedNonce: string) {
    const result = await this.client().acquireTokenByCode({
      code,
      scopes: SCOPES,
      redirectUri: this.redirectUri!,
      codeVerifier: verifier,
    });

    const claims = (result.idTokenClaims ?? {}) as Record<string, any>;

    // Defense in depth on top of MSAL's signature/issuer/audience/expiry checks.
    if (!expectedNonce || claims.nonce !== expectedNonce) {
      throw new UnauthorizedException('Nonce mismatch');
    }
    if (!claims.tid || claims.tid !== this.tenantId) {
      throw new UnauthorizedException('Token from an untrusted tenant');
    }

    const oid: string | undefined = claims.oid ?? result.account?.localAccountId;
    const email: string | undefined =
      claims.preferred_username ?? claims.email ?? claims.upn ?? result.account?.username;
    const name: string = claims.name ?? email ?? 'Unknown';
    if (!oid || !email) {
      throw new UnauthorizedException('Entra token is missing required claims');
    }

    return this.provisionUser({ oid, email, name });
  }

  private async provisionUser({ oid, email, name }: { oid: string; email: string; name: string }) {
    // 1) Known Entra identity (stable oid is the canonical key) — keep name in sync.
    const byOid = await this.usersService.findByEntraOid(oid);
    if (byOid) {
      if (byOid.name !== name) await this.usersService.syncEntraProfile(byOid.id, name);
      return byOid;
    }

    // 2) Email matches an existing (local) account — auto-link to SSO.
    //    Safe because the tenant is verified (tid) and the email comes from a verified claim.
    const byEmail = await this.usersService.findByEmail(email);
    if (byEmail) {
      return this.usersService.linkEntraOid(byEmail.id, oid);
    }

    // 3) Unknown tenant users are not created just-in-time. Company Admins or
    // Super Admins must pre-provision them so every account has a company.
    throw new UnauthorizedException('Account must be provisioned before Entra SSO login');
  }
}
