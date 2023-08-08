import router from "./router.ts";

Deno.serve((req) => router.requestHandler(req));