require("dotenv").config();
const express = require("express");
const cors = require("cors");

const hnRoutes = require("./routes/hn");
const bookmarkRoutes = require("./routes/bookmarks");
const summarizeRoutes = require("./routes/summarize");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/hn", hnRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/summarize", summarizeRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});