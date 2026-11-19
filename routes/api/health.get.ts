import { defineHandler, setHeader } from "h3";

export default defineHandler(event => {
  setHeader(event, "Cache-Control", "no-store");
  return { status: "ok" };
});
