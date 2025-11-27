import { serve } from "inngest/bun";
import { env } from "../env";
import { inngest, inngestFunctions } from "./index";

/**
 * Example Inngest server for development
 * This can be used to test Inngest functions locally
 */

const server = Bun.serve({
  port: env.PORT || 8000,
  routes: {
    "/": async (_) => {
      return new Response("Inngest Server Running");
    },
    "/api/inngest": (request: Request) => {
      return serve({ client: inngest, functions: inngestFunctions })(request);
    },
  },
});

console.log(`🚀 Inngest server listening on ${server.hostname}:${server.port}`);
console.log(
  `📡 Inngest endpoint: http://${server.hostname}:${server.port}/api/inngest`
);
