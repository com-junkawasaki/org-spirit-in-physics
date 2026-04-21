import { p as public_env } from "./shared-server.js";
const getEnv = (key, defaultValue = "") => {
  if (key === "PUBLIC_CLERK_PUBLISHABLE_KEY" && (public_env[key] === void 0 || public_env[key] === "")) {
    return "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ";
  }
  if (key === "PUBLIC_API_URL" && (public_env[key] === void 0 || public_env[key] === "")) {
    return "/api";
  }
  if (key === "PUBLIC_API_MODE" && (public_env[key] === void 0 || public_env[key] === "")) {
    return "worker-partial";
  }
  return public_env[key] || defaultValue;
};
const runtimeConfig = {
  get PUBLIC_CLERK_PUBLISHABLE_KEY() {
    return getEnv("PUBLIC_CLERK_PUBLISHABLE_KEY");
  }
};
getEnv("PUBLIC_CLERK_PUBLISHABLE_KEY");
getEnv("PUBLIC_API_URL");
getEnv("PUBLIC_API_MODE");
export {
  runtimeConfig as r
};
