import { defineHandler, setHeader } from "h3";
import { publicPlatformScript } from "../../../server/_core/publicConfig";

export default defineHandler(event => {
  setHeader(event, "Content-Type", "application/javascript; charset=utf-8");
  setHeader(event, "Cache-Control", "no-store");
  return publicPlatformScript();
});
