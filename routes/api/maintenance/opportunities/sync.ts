import {
  defineHandler,
  getHeader,
  getMethod,
  setHeader,
  setResponseStatus,
} from "h3";
import { handleOpportunitySync } from "../../../../server/_core/maintenance";

export default defineHandler(async event => {
  setHeader(event, "Cache-Control", "no-store");
  if (getMethod(event) !== "POST") {
    setHeader(event, "Allow", "POST");
    setResponseStatus(event, 405);
    return { error: "Method not allowed" };
  }
  const result = await handleOpportunitySync(getHeader(event, "authorization"));
  setResponseStatus(event, result.status);
  return result.body;
});
