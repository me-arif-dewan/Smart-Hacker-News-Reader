const request = require("supertest");
const express = require("express");
const hnRouter = require("../routes/hn");

// Mock axios
jest.mock("axios");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use("/api/hn", hnRouter);

describe("GET /api/hn/stories/:type", () => {
  it("returns stories for valid type", async () => {
    // Mock stories ID list
    axios.get
      .mockResolvedValueOnce({ data: [1, 2, 3] }) // ID list
      .mockResolvedValueOnce({ data: { id: 1, title: "Story 1", by: "user1", score: 100, descendants: 20, time: 1700000000, url: "https://example.com", type: "story" } })
      .mockResolvedValueOnce({ data: { id: 2, title: "Story 2", by: "user2", score: 200, descendants: 30, time: 1700000001, url: null, type: "story" } })
      .mockResolvedValueOnce({ data: { id: 3, title: "Story 3", by: "user3", score: 300, descendants: 40, time: 1700000002, url: "https://example2.com", type: "story" } });

    const res = await request(app).get("/api/hn/stories/top");
    expect(res.status).toBe(200);
    expect(res.body.stories).toBeDefined();
    expect(res.body.page).toBe(1);
    expect(res.body.hasMore).toBeDefined();
  });

  it("returns 400 for invalid story type", async () => {
    const res = await request(app).get("/api/hn/stories/invalid");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe("GET /api/hn/item/:id", () => {
  it("returns story with comments", async () => {
    axios.get
      .mockResolvedValueOnce({ data: {
        id: 123,
        title: "Test Story",
        by: "author1",
        score: 150,
        descendants: 2,
        time: 1700000000,
        url: "https://example.com",
        kids: [101, 102]
      }})
      .mockResolvedValueOnce({ data: {
        id: 101, text: "Great article!", by: "commenter1",
        time: 1700000100, kids: []
      }})
      .mockResolvedValueOnce({ data: {
        id: 102, text: "I disagree.", by: "commenter2",
        time: 1700000200, kids: []
      }});

    const res = await request(app).get("/api/hn/item/123");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Test Story");
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  it("returns 404 for non-existent story", async () => {
    axios.get.mockResolvedValueOnce({ data: null });

    const res = await request(app).get("/api/hn/item/99999999");
    expect(res.status).toBe(404);
  });
});