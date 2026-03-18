const express = require("express");
const router = express.Router();
const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = "llama3.2:1b";
const HN_BASE = "https://hacker-news.firebaseio.com/v0";

async function fetchItem(id) {
  const { data } = await axios.get(`${HN_BASE}/item/${id}.json`);
  return data;
}

async function fetchComments(ids, depth = 0, maxDepth = 3) {
  if (!ids || ids.length === 0 || depth > maxDepth) return [];
  const comments = await Promise.all(ids.slice(0, 15).map((id) => fetchItem(id)));
  const valid = comments.filter((c) => c && !c.deleted && !c.dead && c.text);
  return Promise.all(
    valid.map(async (c) => ({
      id: c.id,
      text: c.text,
      author: c.by,
      replies: await fetchComments(c.kids, depth + 1, maxDepth),
    }))
  );
}

function flattenComments(comments, depth = 0) {
  let result = "";
  for (const c of comments) {
    const indent = "  ".repeat(depth);
    const text = c.text
      .replace(/&#x2F;/gi, "/")
      .replace(/&#x27;/gi, "'")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    result += `${indent}[${c.author}]: ${text}\n\n`;
    if (c.replies?.length > 0) {
      result += flattenComments(c.replies, depth + 1);
    }
  }
  return result;
}

function truncateText(text, maxChars = 4000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[...truncated...]";
}

function extractJSON(raw) {
  try { return JSON.parse(raw); } catch (_) {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  const stripped = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(stripped); } catch (_) {}
  const match2 = stripped.match(/\{[\s\S]*\}/);
  if (match2) {
    try { return JSON.parse(match2[0]); } catch (_) {}
  }
  return null;
}

// SSE helper
function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// GET /api/summarize/:storyId  (SSE)
router.get("/:storyId", async (req, res) => {
  const { storyId } = req.params;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // Step 1: fetch story
    sendEvent(res, "status", { message: "Fetching story..." });
    const story = await fetchItem(storyId);
    if (!story) {
      sendEvent(res, "error", { message: "Story not found" });
      return res.end();
    }

    // Step 2: fetch comments
    sendEvent(res, "status", { message: "Fetching comments..." });
    const comments = await fetchComments(story.kids);
    if (!comments || comments.length === 0) {
      sendEvent(res, "error", { message: "No comments to summarize" });
      return res.end();
    }

    // Step 3: flatten + truncate
    sendEvent(res, "status", { message: `Processing ${comments.length} comments...` });
    const flat = flattenComments(comments.slice(0, 10));
    const truncated = truncateText(flat);

    // Step 4: call Ollama
    sendEvent(res, "status", { message: "Analyzing discussion with AI..." });

    const prompt = `Analyze this Hacker News discussion and respond with JSON only.

Title: ${story.title}

Comments:
${truncated}

You must respond with this exact JSON structure and nothing else:
{"summary":"write 2 sentences about the discussion here","keyPoints":["first key point","second key point","third key point"],"sentiment":"mixed","sentimentReason":"write one sentence about sentiment here"}

Rules:
- sentiment must be one of: positive, negative, mixed, neutral
- No markdown, no backticks, no explanation
- Just the raw JSON object`;

    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: MODEL,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
          num_predict: 500,
        },
      },
      { timeout: 180000 }
    );

    const raw = response.data.response.trim();
    const parsed = extractJSON(raw);

    if (!parsed) {
      sendEvent(res, "error", { message: "AI returned invalid response" });
      return res.end();
    }

    // Step 5: done
    const result = {
      summary: parsed.summary || "No summary available.",
      keyPoints: Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0
        ? parsed.keyPoints
        : ["Discussion analysis unavailable"],
      sentiment: ["positive", "negative", "mixed", "neutral"].includes(parsed.sentiment)
        ? parsed.sentiment
        : "neutral",
      sentimentReason: parsed.sentimentReason || "Sentiment could not be determined.",
    };

    sendEvent(res, "done", result);
    res.end();

  } catch (err) {
    console.error("Summarize error:", err.message);
    if (err.code === "ECONNABORTED") {
      sendEvent(res, "error", { message: "AI timed out. Try a story with fewer comments." });
    } else if (err.code === "ECONNREFUSED" || err.message?.includes("AggregateError")) {
      sendEvent(res, "error", { message: "Ollama is unavailable. Make sure the model is pulled." });
    } else {
      sendEvent(res, "error", { message: "Something went wrong. Please try again." });
    }
    res.end();
  }
});

module.exports = router;