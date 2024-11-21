import { faker } from "@faker-js/faker";
import { AxiosError } from "axios";
import { http, HttpResponse } from "msw";
import { setupServer, SetupServerApi } from "msw/node";

import { HydraClient } from "../hydra-client";
import { HydraConfig, HydraTokenResponse } from "../interfaces";

const HYDRA_CONFIG: HydraConfig = {
  url: "http://example.com/hydra",
  clientId: `client-id-${new Date().toISOString()}`,
  clientSecret: `client-secret-${new Date().toISOString()}`,
};

const EXPIRES_IN = 60 * 60; // 1 hour in seconds

const EXPIRATION_TIME_MS = EXPIRES_IN * 1000 + 1;
const REFRESH_TIME_MS = EXPIRATION_TIME_MS / 2 + 1;

const makeHydraTokenResponse = (): HydraTokenResponse => ({
  access_token: faker.string.alphanumeric(10),
  expires_in: 60 * 60, // 1 hour in seconds
  token_type: "client_credentials",
  scope: faker.word.noun(),
});

describe("HydraClient", () => {
  let server: SetupServerApi;

  let hydraClient: HydraClient;
  beforeAll(() => {
    server = setupServer(
      http.post(`${HYDRA_CONFIG.url}/oauth2/token`, () =>
        HttpResponse.json(makeHydraTokenResponse()),
      ),
    );

    server.listen();
  });

  beforeEach(() => {
    hydraClient = new HydraClient(HYDRA_CONFIG);
  });

  afterEach(() => {
    jest.useRealTimers();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("should fetch and return a token when the cache is empty", async () => {
    let hydraRequest: Request | undefined;
    server.events.on("request:end", ({ request }) => {
      hydraRequest = request;
    });

    const authHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    expect(authHeader).toMatch(/^Bearer .+$/);
    await expectRequestToBeHydraTokenRequest(hydraRequest, "test-target");
  });

  it("should return the cached token when it is present and not requiring refresh", async () => {
    const cachedHeader = await hydraClient.getAuthHeaderForTarget("test-target");
    await hydraClient.getAuthHeaderForTarget("other-target");

    const authHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    expect(authHeader).toBe(cachedHeader);
  });

  it("should refresh and return the token when the token is older than half its lifetime", async () => {
    jest.useFakeTimers();

    const requests: Request[] = [];
    server.events.on("request:end", ({ request }) => {
      requests.push(request);
    });

    const firstHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    jest.advanceTimersByTime(REFRESH_TIME_MS);

    const secondHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    expect(secondHeader).not.toBe(firstHeader);
    expect(requests).toHaveLength(2);

    const [, lastRequest] = requests;
    await expectRequestToBeHydraTokenRequest(lastRequest, "test-target");

    const thirdTimer = await hydraClient.getAuthHeaderForTarget("test-target");

    expect(thirdTimer).toBe(secondHeader);
  });

  it("should return the old token when the token is older than half its lifetime and refreshing fails", async () => {
    jest.useFakeTimers();

    const firstHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    jest.advanceTimersByTime(REFRESH_TIME_MS);

    server.use(
      http.post(`${HYDRA_CONFIG.url}/oauth2/token`, () =>
        HttpResponse.json(
          { error: "server_error", error_description: "Internal Server Error" },
          { status: 500 },
        ),
      ),
    );

    const secondHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    expect(secondHeader).toBe(firstHeader);
  });

  it("should refresh and return the token when the token is expired", async () => {
    jest.useFakeTimers();

    const requests: Request[] = [];
    server.events.on("request:end", ({ request }) => {
      requests.push(request);
    });

    const firstHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    jest.advanceTimersByTime(EXPIRATION_TIME_MS);

    const secondHeader = await hydraClient.getAuthHeaderForTarget("test-target");

    expect(secondHeader).not.toBe(firstHeader);
    expect(requests).toHaveLength(2);

    const [, lastRequest] = requests;
    await expectRequestToBeHydraTokenRequest(lastRequest, "test-target");

    const thirdTimer = await hydraClient.getAuthHeaderForTarget("test-target");

    expect(thirdTimer).toBe(secondHeader);
  });

  it("should  throw an error when the token is expired an refresh fails", async () => {
    jest.useFakeTimers();

    await hydraClient.getAuthHeaderForTarget("test-target");

    jest.advanceTimersByTime(EXPIRATION_TIME_MS);

    server.use(
      http.post(`${HYDRA_CONFIG.url}/oauth2/token`, () =>
        HttpResponse.json(
          { error: "server_error", error_description: "Internal Server Error" },
          { status: 500 },
        ),
      ),
    );

    await expect(() => hydraClient.getAuthHeaderForTarget("test-target")).rejects.toBeInstanceOf(
      AxiosError,
    );
  });
});

const expectRequestToBeHydraTokenRequest = async (
  request: Request | undefined,
  target: string,
): Promise<void> => {
  expect(request).toBeDefined();
  expect(request).toHaveProperty("url", `${HYDRA_CONFIG.url}/oauth2/token`);

  const body = new TextDecoder().decode((await request?.body?.getReader().read())?.value);

  expect(body).toContain(`grant_type=client_credentials&audience=${target}`);
};
