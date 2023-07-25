import * as Peko from "https://deno.land/x/peko@1.9.0/mod.ts";
import deviceRouter from "./routers/device.ts";
import { state2Sheet } from "./middleware/state2Sheet.ts";

const server = new Peko.Server();
server.use(Peko.logger(console.log));
server.use(state2Sheet);
server.use(deviceRouter);

server.listen(7777, () => console.log("Peko server started - let's go!"));