const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// GET all bookmarks
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM bookmarks ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET search bookmarks
router.get("/search", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const [rows] = await pool.query(
      "SELECT * FROM bookmarks WHERE title LIKE ? OR author LIKE ? ORDER BY created_at DESC",
      [`%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST create bookmark
router.post("/", async (req, res, next) => {
  try {
    const { story_id, title, url, author, score, comment_count } = req.body;
    if (!story_id || !title) {
      return res.status(400).json({ error: "story_id and title are required" });
    }
    await pool.query(
      `INSERT INTO bookmarks (story_id, title, url, author, score, comment_count)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title)`,
      [story_id, title, url || null, author || null, score || 0, comment_count || 0]
    );
    const [rows] = await pool.query(
      "SELECT * FROM bookmarks WHERE story_id = ?",
      [story_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE remove bookmark
router.delete("/:storyId", async (req, res, next) => {
  try {
    const { storyId } = req.params;
    await pool.query("DELETE FROM bookmarks WHERE story_id = ?", [storyId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;