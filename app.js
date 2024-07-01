import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ErrorMiddleware } from "./middleware/error.js";

export const app = express();
// app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors => cross origin resource sharing
// app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// app.use("/api/v1", userRouter);
// app.use("/api/v1", courseRoute);
// app.use("/api/v1", orderRouter);
// app.use("/api/v1", notificationRouter);
// app.use("/api/v1", analyticsRoute);
// app.use("/api/v1", layoutRoute);

// reusable error handler
app.use(ErrorMiddleware);
