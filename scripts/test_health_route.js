import express from "express";

const app = express();

app.get(["/", "/api", "/api/health"], (req, res) => {
  res.json({
    name: "Khata Production API Backend Server",
    status: "online",
    version: "3.0.0",
    database: "postgresql (Neon)",
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(5099, async () => {
  try {
    const res = await fetch("http://localhost:5099/api/health");
    const data = await res.json();
    console.log("HEALTH ROUTE TEST RESULT:", data);
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
