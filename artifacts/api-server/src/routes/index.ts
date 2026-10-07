import { Router, type IRouter } from "express";
import healthRouter from "./health";
import markersRouter from "./markers";
import assetsRouter from "./assets";
import zonesRouter from "./zones";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(markersRouter);
router.use(assetsRouter);
router.use(zonesRouter);
router.use(dashboardRouter);

export default router;
