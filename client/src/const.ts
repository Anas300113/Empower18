export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Backwards-compatible helper for callers that still use the old name.
export const startLogin = () => {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
};
