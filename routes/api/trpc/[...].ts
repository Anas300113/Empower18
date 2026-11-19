import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { defineHandler } from "h3";
import { createContext } from "../../../server/_core/context";
import { appRouter } from "../../../server/routers";

export default defineHandler(event =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: event.req,
    router: appRouter,
    createContext: async ({ req, resHeaders }) => {
      resHeaders.set("Cache-Control", "no-store");
      const expressRequest = {
        headers: Object.fromEntries(req.headers.entries()),
      } as unknown as CreateExpressContextOptions["req"];
      const expressResponse = {
        clearCookie(
          name: string,
          options?: {
            path?: string;
            httpOnly?: boolean;
            secure?: boolean;
            sameSite?: string | boolean;
          }
        ) {
          const parts = [`${name}=`, `Path=${options?.path ?? "/"}`];
          if (options?.httpOnly) parts.push("HttpOnly");
          if (options?.secure) parts.push("Secure");
          if (options?.sameSite) {
            const value =
              typeof options.sameSite === "string"
                ? options.sameSite[0]!.toUpperCase() + options.sameSite.slice(1)
                : "Strict";
            parts.push(`SameSite=${value}`);
          }
          parts.push("Max-Age=0");
          resHeaders.append("Set-Cookie", parts.join("; "));
        },
      } as unknown as CreateExpressContextOptions["res"];

      return createContext({ req: expressRequest, res: expressResponse });
    },
  })
);
