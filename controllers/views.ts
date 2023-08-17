import { Handler } from "peko";
import { renderToReadableStream } from "react-dom/server"
import { System } from "../types.ts";

import Home from "../views/home.ts";

export const home: Handler = async (ctx) => {
  if (!ctx.state.systems) throw new Error("Home view requires 'Systems' state");
  
  return new Response(await renderToReadableStream(Home({ 
    systems: ctx.state.systems 
  } as { systems: System[] })));
};