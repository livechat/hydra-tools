import axios, { AxiosInstance } from "axios";

import { HydraConfig, HydraLogger, HydraToken, HydraTokenResponse } from "./interfaces";
import { getErrorMessage } from "./utils";

const mustRefreshToken = (token: HydraToken): boolean => {
  return token.refreshIn < Date.now();
};

const isTokenExpired = (token: HydraToken): boolean => {
  return token.expiresIn < Date.now();
};

export class HydraClient {
  private tokenMap = new Map<string, HydraToken>();
  private fetcher: AxiosInstance;

  constructor(
    config: HydraConfig,
    private readonly logger?: HydraLogger,
  ) {
    this.fetcher = axios.create({
      baseURL: config.url,
      timeout: config.timeout ?? 5000,
      auth: {
        username: config.clientId,
        password: config.clientSecret,
      },
    });
  }

  async getAuthHeaderForTarget(target: string): Promise<string> {
    const cachedToken = this.tokenMap.get(target);

    if (cachedToken && !mustRefreshToken(cachedToken)) {
      return cachedToken.authHeader;
    }

    try {
      const token = await this.queryHydraForToken(target);
      this.tokenMap.set(target, token);

      return token.authHeader;
    } catch (error: unknown) {
      if (cachedToken && !isTokenExpired(cachedToken)) {
        return cachedToken.authHeader;
      }

      throw error;
    }
  }

  private async queryHydraForToken(target: string): Promise<HydraToken> {
    const params = new URLSearchParams();

    params.append("grant_type", "client_credentials");
    params.append("audience", target);

    try {
      const response = await this.fetcher.post<HydraTokenResponse>(`/oauth2/token`, params);
      const token = response.data;

      return {
        authHeader: "Bearer " + token.access_token,
        scope: token.scope,
        accessToken: token.access_token,
        expiresIn: Date.now() + token.expires_in * 1000,
        refreshIn: Date.now() + (token.expires_in / 2) * 1000,
        tokenType: token.token_type,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);

      this.logger?.error(`error during call hydra for: ${target} err: ${errorMessage}}`);

      throw error;
    }
  }
}
