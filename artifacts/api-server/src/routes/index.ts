import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import devicesRouter from "./devices";
import payrollRouter from "./payroll";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/companies", companiesRouter);
router.use("/employees", employeesRouter);
router.use("/attendance", attendanceRouter);
router.use("/devices", devicesRouter);
router.use("/payroll", payrollRouter);
router.use("/reports", reportsRouter);

export default router;
