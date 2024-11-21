import axios from "axios";

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    try {
      return JSON.stringify(error.response?.data);
    } catch {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};
