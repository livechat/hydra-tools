/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
    const runWhen = (config: AxiosRequestConfig) => config.headers?.["X-Use-Hydra"] === true;

    withHydraInterceptor(axiosInstance, { hydraClient, target: hydraTarget, runWhen });
  });
  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("should add X-Authorization when the conditions are met", async () => {
    let headers: Headers | null = null;
    server.events.on("request:start", ({ request }) => {
      headers = request.headers;
    });

    await axiosInstance.get("/hydra-endpoint", {
      headers: { "X-Use-Hydra": true },
    });

    expect(headers).toBeDefined();
    expect(headers!.get("X-Authorization")).toBe(hydraToken);
  });

  it("should not add X-Authorization when the conditions are not met", async () => {
    let headers: Headers | null = null;
    server.events.on("request:start", ({ request }) => {
      headers = request.headers;
    });

    await axiosInstance.get("/hydra-endpoint");

    expect(headers).toBeDefined();
    expect(headers!.get("X-Authorization")).toBeNull();
  });

  it("should call hydra with the correct target", async () => {
    const hydraSpy = jest.spyOn(hydraClient, "getAuthHeaderForTarget");

    await axiosInstance.get("/hydra-endpoint", {
      headers: { "X-Use-Hydra": true },
    });

    expect(hydraSpy).toHaveBeenCalledWith(hydraTarget);
  });
});
