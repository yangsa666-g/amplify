import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Req,
  Res,
  Query,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { EntraService } from './entra.service';
import { EntraCodeStore } from './entra-code.store';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';
import { RefreshDto, LogoutDto, ChangePasswordDto, EntraExchangeDto } from './dto/auth.dto';
import { AuthenticationSettingsService } from '../authentication-settings/authentication-settings.service';

const ENTRA_TX_COOKIE = 'entra_tx';

interface EntraTx {
  verifier: string;
  state: string;
  nonce: string;
  returnTo?: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private entraService: EntraService,
    private codeStore: EntraCodeStore,
    private config: ConfigService,
    private authenticationSettings: AuthenticationSettingsService,
  ) {}

  // login uses LocalStrategy's req.user (full DB user shape, not JWT payload)
  // Tight limit to slow credential-stuffing / brute force.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any) {
    return this.authService.login(req.user);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto) {
    if (!body.refreshToken) throw new UnauthorizedException('Refresh token is required');
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: LogoutDto) {
    if (body.refreshToken) {
      await this.authService.revokeRefreshToken(body.refreshToken);
    }
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    await this.authService.changePassword(user.userId, body.oldPassword, body.newPassword);
    return { message: 'Password changed successfully' };
  }

  // ─── Microsoft Entra ID SSO ────────────────────────────────────────────────

  // Lets the SPA decide whether to render the "Sign in with Microsoft" button.
  @Get('entra/enabled')
  entraEnabled() {
    return { enabled: this.entraService.isEnabled() };
  }

  @Get('configuration')
  async authenticationConfiguration() {
    const { localAuthEnabled } = await this.authenticationSettings.getConfiguration();
    return { localAuthEnabled, entraAuthEnabled: this.entraService.isEnabled() };
  }

  // Step 1: build the authorize URL, stash PKCE/state/nonce in a signed httpOnly
  // cookie, and redirect the browser to Microsoft.
  @Get('entra/login')
  async entraLogin(@Query('returnTo') returnTo: string | undefined, @Res() res: any) {
    if (!this.entraService.isEnabled()) {
      throw new ServiceUnavailableException('Entra SSO is not configured');
    }
    const { url, verifier, state, nonce } = await this.entraService.buildAuthCodeUrl();
    const tx: EntraTx = { verifier, state, nonce, returnTo: this.safeReturnTo(returnTo) };
    res.cookie(ENTRA_TX_COOKIE, JSON.stringify(tx), this.txCookieOptions());
    res.redirect(url);
  }

  // Step 2: validate state, exchange the code, provision the user, mint app
  // tokens, and redirect back to the SPA with a one-time exchange code.
  @Get('entra/callback')
  async entraCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: any,
    @Res() res: any,
  ) {
    const raw = req.signedCookies?.[ENTRA_TX_COOKIE];
    res.clearCookie(ENTRA_TX_COOKIE, { path: '/' });

    let tx: EntraTx | null = null;
    if (typeof raw === 'string') {
      try {
        tx = JSON.parse(raw);
      } catch {
        tx = null;
      }
    }

    if (error) return res.redirect(this.loginErrorUrl('provider'));
    // CSRF: the state echoed by Microsoft must match the one in our cookie.
    if (!tx || !code || !state || state !== tx.state) {
      return res.redirect(this.loginErrorUrl('state'));
    }

    let user;
    try {
      user = await this.entraService.handleCallback(code, tx.verifier, tx.nonce);
    } catch {
      return res.redirect(this.loginErrorUrl('exchange'));
    }

    if (user.status === 'disabled') return res.redirect(this.loginErrorUrl('disabled'));

    const tokens = await this.authService.login(user);
    const oneTimeCode = this.codeStore.issue(tokens);
    return res.redirect(this.successUrl(oneTimeCode, tx.returnTo));
  }

  // Step 3: the SPA trades the one-time code for the app session tokens.
  @Post('entra/exchange')
  @HttpCode(HttpStatus.OK)
  entraExchange(@Body() body: EntraExchangeDto) {
    const tokens = body?.code ? this.codeStore.consume(body.code) : null;
    if (!tokens) throw new BadRequestException('Invalid or expired code');
    return tokens;
  }

  private txCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const, // must be 'lax' so the cookie survives the top-level redirect back from Microsoft
      signed: true,
      maxAge: 10 * 60 * 1000,
      path: '/',
    };
  }

  // Resolves the SPA base URL for post-callback redirects. Prefers the explicit
  // ENTRA_POST_LOGIN_REDIRECT, otherwise derives it from the origin of
  // ENTRA_REDIRECT_URI (which is mandatory for SSO to be enabled at all), so a
  // deployed environment never silently redirects to the localhost dev default.
  private postLoginBase(): string {
    const explicit = this.config.get<string>('ENTRA_POST_LOGIN_REDIRECT');
    if (explicit) return explicit;

    const redirectUri = this.config.get<string>('ENTRA_REDIRECT_URI');
    if (redirectUri) {
      this.logger.warn(
        'ENTRA_POST_LOGIN_REDIRECT is not set; deriving the SPA redirect from ENTRA_REDIRECT_URI origin.',
      );
      return `${new URL(redirectUri).origin}/auth/callback`;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENTRA_POST_LOGIN_REDIRECT or ENTRA_REDIRECT_URI must be configured for SSO in production',
      );
    }
    return 'http://localhost:3000/auth/callback';
  }

  private frontendOrigin(): string {
    return new URL(this.postLoginBase()).origin;
  }

  private loginErrorUrl(code: string): string {
    return `${this.frontendOrigin()}/login?sso_error=${encodeURIComponent(code)}`;
  }

  private successUrl(code: string, returnTo?: string): string {
    const u = new URL(this.postLoginBase());
    u.searchParams.set('code', code);
    if (returnTo) u.searchParams.set('returnTo', returnTo);
    return u.toString();
  }

  // Open-redirect guard: only accept relative, single-slash paths.
  private safeReturnTo(v?: string): string | undefined {
    if (!v || !v.startsWith('/') || v.startsWith('//')) return undefined;
    return v;
  }
}
