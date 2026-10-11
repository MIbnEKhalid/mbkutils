import dotenv from "dotenv";
import createDebug from "debug";

dotenv.config();

const debugPattern = process.env.DEBUG || process.env.debug || "";
if (debugPattern) {
  createDebug.enable(debugPattern);
}

/**
 * Creates a debug logger instance namespaced for an application or subsystem.
 * @param {string} [namespace=""]
 */
export const createLogger = (namespace = "") => {
  const rootNamespace = process.env.APP_NAME || "mbk";
  return createDebug(`${rootNamespace}${namespace ? `:${namespace}` : ""}`);
};

export const logDebug = createLogger();
