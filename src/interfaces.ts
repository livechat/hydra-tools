interface LogFn {
  (obj: unknown, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
}

export interface HydraLogger {
  error: LogFn;
}

export interface HydraConfig {
  url: string;
  clientId: string;
  clientSecret: string;
  timeout?: number;
}

export interface HydraTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface HydraToken {
  authHeader: string;
  accessToken: string;
  expiresIn: number;
  refreshIn: number;
  tokenType: string;
  scope: string;
}
