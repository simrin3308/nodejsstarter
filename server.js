import dotenv from "dotenv";
import { app } from "./app.js";
import cors from "cors";
import connectDB from "./utils/db.js";
import http from "http";
// create server
const server = http.createServer(app);
const PORT = 5000;
dotenv.config();

// app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

app.get("/test", (req, res) => {
  res.status(200).send("server is running");
});

app.all("*", (req, res) => {
  res.status(404).send("Route not found");
});
