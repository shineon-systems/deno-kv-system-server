import { RequestContext, Next } from "peko";
import { getAccess, POST2Sheet } from "../utils/gcp.ts";
import { loadSystem } from "../models/System.ts";
import { Device } from "../types.ts";

const kv = await Deno.openKv();
let waiting = false;

// quick hacky middleware to get data POSTed once per set of requests
export async function state2Sheet(ctx: RequestContext, next: Next) {
  await next();

  (async function () {
    const system = loadSystem(ctx.request);
    if (ctx.request.url.includes("sense") && !waiting) {
      waiting = true;
      await getAccess();
      await new Promise(res => setTimeout(res, system.polling_interval/2));
      const states: Record<string, Device> = {};
      for (const device_id in system.devices) {
        states[device_id] = (await kv.get(["state", device_id])).value as Device;
      }
      POST2Sheet(states);
      waiting = false;
    }
  })();
}