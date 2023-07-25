import { Middleware } from "https://deno.land/x/peko@1.9.0/mod.ts";
import { getAccess, POST2Sheet } from "../utils/gcp.ts";
import { system } from "../models/System.ts";
import { Device } from "../types.ts";

const kv = await Deno.openKv(); 
let waiting = false

// quick hacky middleware to get data POSTed once per set of requests
export const state2Sheet: Middleware = async (ctx, next) => {
  next()
  if (ctx.request.url.includes("sense") && !waiting) {
    waiting = true
    await getAccess()
    await new Promise(res => setTimeout(res, system.polling_interval/2))
    const states: Record<string, Device> = {}
    for (const device_id in system.devices) {
      states[device_id] = (await kv.get(["state", device_id])).value as Device
    }
    POST2Sheet(states)
    waiting = false
  }
}