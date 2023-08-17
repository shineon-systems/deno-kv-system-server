import { RequestContext } from "peko";
import { loadSystem } from "../models/System.ts";

export function systemsMiddleware(ctx: RequestContext) {
  const system = loadSystem(ctx.request);
  ctx.state.systems = [system];
}