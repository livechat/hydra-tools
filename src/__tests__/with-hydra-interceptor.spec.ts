import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { http, HttpResponse } from "msw";
import { setupServer, SetupServerApi } from "msw/node";

import { HydraClient } from "../hydra-client";
import { withHydraInterceptor } from "../with-hydra-interceptor";

describe("withHydraInterceptor", () => {
  let server: SetupServerApi;

  let axiosInstance: AxiosInstance;

  const hydraToken = "hydra-token" + new Date().toISOString();
  const hydraTarget = "test-target";
  let hydraClient: HydraClient;

  beforeAll(() => {
    server = setupServer(http.all("*", () => HttpResponse.json({})));

    server.listen();
  });

  beforeAll(() => {
    hydraClient = {
      getAuthHeaderForTarget: async () => await Promise.resolve(hydraToken),
    } as unknown as HydraClient;

    axiosInstance = axios.create();
    const runWhen = (config: AxiosRequestConfig) => config.headers?.["X-Use-Hydra"] === "yes";

    withHydraInterceptor(axiosInstance, { hydraClient, target: hydraTarget, runWhen });
  });
  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("should add Proxy-Authorization when the conditions are met", async () => {
    let headers: Headers | null = null;
    server.events.on("request:start", ({ request }) => {
      headers = request.headers;
    });

    await axiosInstance.get("http://example.com/hydra-endpoint", {
      headers: { "X-Use-Hydra": "yes" },
    });

    expect(headers).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(headers!.get("Proxy-Authorization")).toBe(hydraToken);
  });

  it("should not add Proxy-Authorization when the conditions are not met", async () => {
    let headers: Headers | null = null;
    server.events.on("request:start", ({ request }) => {
      headers = request.headers;
    });

    await axiosInstance.get("http://example.com/hydra-endpoint");

    expect(headers).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(headers!.get("Proxy-Authorization")).toBeNull();
  });

  it("should call hydra with the correct target", async () => {
    const hydraSpy = jest.spyOn(hydraClient, "getAuthHeaderForTarget");

    await axiosInstance.get("http://example.com/hydra-endpoint", {
      headers: { "X-Use-Hydra": "yes" },
    });

    expect(hydraSpy).toHaveBeenCalledWith(hydraTarget);
  });
});
