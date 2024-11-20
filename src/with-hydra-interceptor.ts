import axios, { AxiosInstance, AxiosInterceptorManager, AxiosInterceptorOptions } from "axios";

import { HydraClient } from "./hydra-client";

export const withHydraInterceptor = (
  axiosInstance: AxiosInstance,
  {
    hydraClient,
    target,
    runWhen,
  }: {
    hydraClient: HydraClient;
    target: string;
    runWhen: NonNullable<AxiosInterceptorOptions["runWhen"]>;
  },
): AxiosInterceptorManager<unknown>["eject"] => {
  const id = axiosInstance.interceptors.request.use(
    async (config) => {
      const token = await hydraClient.getAuthHeaderForTarget(target);

      config.headers["X-Authorization"] = token;

      return config;
    },
    (error) => {
      throw error;
    },
    {
      synchronous: false,
      runWhen: (config) => {
        return runWhen(config);
      },
    },
  );

  return () => {
    axios.interceptors.request.eject(id);
  };
};
