const express = require("express");
const router = express.Router();
const axios = require("axios");

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

// Fetch a single item (story or comment)
async function fetchItem(id) {
  const { data } = await axios.get(`${HN_BASE}/item/${id}.json`);
  return data;
}

// Recursively fetch comment tree (depth-limited)
async function fetchComments(ids, depth = 0, maxDepth = 4) {
  if (!ids || ids.length === 0 || depth > maxDepth) return [];

  const comments = await Promise.all(
    ids.slice(0, 20).map((id) => fetchItem(id))
  );

  const validComments = comments.filter(
    (c) => c && !c.deleted && !c.dead && c.text
  );

  return Promise.all(
    validComments.map(async (comment) => ({
      id: comment.id,
      text: comment.text
        .replace(/&#x2F;/gi, "/")
        .replace(/&#x27;/gi, "'")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"'),
      author: comment.by,
      time: comment.time,
      depth,
      replies: await fetchComments(comment.kids, depth + 1, maxDepth),
    }))
  );
}

// GET /api/hn/stories/:type  (top | new | best)
router.get("/stories/:type", async (req, res, next) => {
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 30;

    const validTypes = ["top", "new", "best"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid story type" });
    }

    const { data: ids } = await axios.get(`${HN_BASE}/${type}stories.json`);

    const start = (page - 1) * limit;
    const pageIds = ids.slice(start, start + limit);

    const stories = await Promise.all(pageIds.map((id) => fetchItem(id)));

    const validStories = stories.filter((s) => s && s.title && !s.deleted);

    res.json({
      stories: validStories.map((s) => ({
        id: s.id,
        title: s.title,
        url: s.url || null,
        author: s.by,
        score: s.score,
        comment_count: s.descendants || 0,
        time: s.time,
        type: s.type,
      })),
      page,
      hasMore: start + limit < ids.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/hn/item/:id  (story + comment tree)
router.get("/item/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const story = await fetchItem(id);

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    const comments = await fetchComments(story.kids);

    res.json({
      id: story.id,
      title: story.title,
      url: story.url || null,
      author: story.by,
      score: story.score,
      comment_count: story.descendants || 0,
      time: story.time,
      text: story.text || null,
      comments,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;