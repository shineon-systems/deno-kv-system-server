import { RequestContext, Next } from "peko";

export async function errorMiddleware(_ctx: RequestContext, next: Next) {
  try {
    await next();
  } catch(e) {
    console.error(e);
    return new Response("Wuh-oh!", {
      status: 500
    })
  }
}