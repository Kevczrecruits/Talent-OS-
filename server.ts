import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { checkPasscode, handleParse, handleGenerateCandidates } from "./api/_lib";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Parsing endpoint
  app.post("/api/parse", async (req, res) => {
    if (!checkPasscode(req.headers)) {
      return res.status(401).json({ error: "Invalid or missing passcode." });
    }
    const result = await handleParse(req.body);
    return res.status(result.status).json(result.json);
  });

  // 2. Generate candidates endpoint
  app.post("/api/generate-candidates", async (req, res) => {
    if (!checkPasscode(req.headers)) {
      return res.status(401).json({ error: "Invalid or missing passcode." });
    }
    const result = await handleGenerateCandidates(req.body);
    return res.status(result.status).json(result.json);
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
