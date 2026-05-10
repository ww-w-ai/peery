/// <reference types="@cloudflare/workers-types" />
/// <reference types="vite/client" />

import type { Env } from "./lib/db.server";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

// Allow CSS imports with ?url suffix in Vite
declare module "*.css?url" {
  const href: string;
  export default href;
}

declare module "*.css" {
  const href: string;
  export default href;
}
