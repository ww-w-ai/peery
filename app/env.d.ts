/// <reference types="@cloudflare/workers-types" />

import type { Env } from "./lib/db.server";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

// Allow CSS module imports in Vite
declare module "*.css?url" {
  const url: string;
  export default url;
}
