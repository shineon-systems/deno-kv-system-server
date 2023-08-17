import * as Peko from "peko";
import { errorMiddleware } from "./middleware/errors.ts";
import { systemsMiddleware } from "./middleware/systems.ts";
import { state2Sheet } from "./middleware/state2Sheet.ts";
import {
  home
} from "./controllers/views.ts"
import { 
  connect,
  sense,
  control
} from "./controllers/device.ts";

const router = new Peko.Router();
router.use(Peko.logger(console.log));
router.use(errorMiddleware);
router.use(state2Sheet);

// view routes
router.get("/", systemsMiddleware, home);

// device routes
router.post("/connect/:id", connect);
router.post("/sense/:id", sense);
router.post("/control/:id", control);

export default router;