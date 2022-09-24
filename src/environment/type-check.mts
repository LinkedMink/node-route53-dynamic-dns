import { StringConvertable } from "../types/string.mjs";

export function isStringConvertable(toCheck: unknown): toCheck is StringConvertable {
  return typeof (toCheck as StringConvertable).toString === "function";
}
