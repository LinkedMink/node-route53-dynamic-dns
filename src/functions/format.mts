import { isNativeError } from "util/types";
import { isStringConvertable } from "./type-check.mjs";

export const formatError = (error: unknown): string => {
  if (isNativeError(error)) {
    return error.stack ? error.stack : error.message;
  } else if (typeof error === "string") {
    return error;
  } else if (isStringConvertable(error)) {
    return error.toString();
  } else {
    const stack = new Error().stack as string;
    return `Unspecified Unhandled Error: ${stack}`;
  }
};
