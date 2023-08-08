import * as Peko from "https://deno.land/x/peko@2.0.0/mod.ts";
import { state2Sheet } from "./middleware/state2Sheet.ts";
import { 
  connect,
  sense,
  control
} from "./controllers/device.ts";

const router = new Peko.Router();

// router.use(Peko.logger(console.log));
router.use(state2Sheet);

router.post("/connect/:id", connect);
router.post("/sense/:id", sense);
router.post("/control/:id", control);

export default router;