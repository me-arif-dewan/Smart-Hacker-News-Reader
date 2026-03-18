const request = require("supertest");
const express = require("express");
const summarizeRouter = require("../routes/summarize");

jest.mock("axios");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use("/api/summarize", summarizeRouter);

// Helper to collect SSE events from raw string
function collectSSE(rawText) {
  const events = [];
  if (!rawText) return events;

  const lines = rawText.split("\n");
  let currentEvent = null;

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent = line.replace("event: ", "").trim();
    } else if (line.startsWith("data: ")) {
      try {
        const data = JSON.parse(line.replace("data: ", "").trim());
        events.push({ event: currentEvent, data });
      } catch (_) {}
    }
  }
  return events;
}

// Helper to make SSE request and return raw text
function sseRequest(storyId) {
  return new Promise((resolve, reject) => {
    let rawData = "";
    request(app)
      .get(`/api/summarize/${storyId}`)
      .buffer(true)
      .parse((res, callback) => {
        res.on("data", (chunk) => { rawData += chunk.toString(); });
        res.on("end", () => callback(null, rawData));
      })
      .then(() => resolve(rawData))
      .catch(reject);
  });
}

describe("GET /api/summarize/:storyId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("streams status events and returns done with summary", async () => {
    axios.get
      .mockResolvedValueOnce({ data: {
        id: 123,
        title: "Test Story",
        kids: [101],
      }})
      .mockResolvedValueOnce({ data: {
        id: 101,
        text: "This is a great discussion about testing.",
        by: "user1",
        time: 1700000000,
        kids: [],
      }});

    axios.post.mockResolvedValueOnce({
      data: {
        response: JSON.stringify({
          summary: "A discussion about testing practices.",
          keyPoints: ["Testing is important", "Use mocks wisely", "Cover edge cases"],
          sentiment: "positive",
          sentimentReason: "The community is enthusiastic about testing.",
        }),
      },
    });

    const rawText = await sseRequest(123);
    const events = collectSSE(rawText);

    const statusEvents = events.filter((e) => e.event === "status");
    const doneEvent = events.find((e) => e.event === "done");

    expect(statusEvents.length).toBeGreaterThan(0);
    expect(doneEvent).toBeDefined();
    expect(doneEvent.data.summary).toBeDefined();
    expect(doneEvent.data.keyPoints).toHaveLength(3);
    expect(["positive", "negative", "mixed", "neutral"]).toContain(doneEvent.data.sentiment);
  });

  it("streams error event when story not found", async () => {
    axios.get.mockResolvedValueOnce({ data: null });

    const rawText = await sseRequest(99999);
    const events = collectSSE(rawText);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent.data.message).toBeDefined();
  });

  it("streams error when story has no comments", async () => {
    axios.get.mockResolvedValueOnce({ data: {
      id: 456,
      title: "No Comments Story",
      kids: [],
    }});

    const rawText = await sseRequest(456);
    const events = collectSSE(rawText);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent.data.message).toBeDefined();
  });

  it("handles Ollama timeout gracefully", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { id: 789, title: "Story", kids: [101] }})
      .mockResolvedValueOnce({ data: {
        id: 101, text: "A comment", by: "user1",
        time: 1700000000, kids: [],
      }});

    const timeoutError = new Error("timeout");
    timeoutError.code = "ECONNABORTED";
    axios.post.mockRejectedValueOnce(timeoutError);

    const rawText = await sseRequest(789);
    const events = collectSSE(rawText);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent.data.message).toContain("timed out");
  });

  it("handles Ollama connection refused gracefully", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { id: 321, title: "Story", kids: [101] }})
      .mockResolvedValueOnce({ data: {
        id: 101, text: "A comment", by: "user1",
        time: 1700000000, kids: [],
      }});

    const connError = new Error("AggregateError");
    connError.code = "ECONNREFUSED";
    axios.post.mockRejectedValueOnce(connError);

    const rawText = await sseRequest(321);
    const events = collectSSE(rawText);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent.data.message).toContain("unavailable");
  });
});