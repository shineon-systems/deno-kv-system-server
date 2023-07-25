import { getAccess, POST2Sheet } from "../utils/gcp.ts";
import { system } from "../models/System.ts";
import { State } from "../types.ts";

const kv = await Deno.openKv(); 
let waiting = false

// quick hacky middleware to get data POSTed once per set of requests
const state2Sheet = async (ctx, next) => {
  next()
  if (ctx.request.url.includes("sense") && !waiting) {
    waiting = true
    await getAccess()
    await new Promise(res => setTimeout(res, 500))
    const states = await Promise.all(system.devices.map(async device => {
      return (await kv.get(["state", device.id])).value as State
    }))
    POST2Sheet(states)
    waiting = false
  }
}