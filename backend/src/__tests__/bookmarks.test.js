const request = require("supertest");
const express = require("express");
const bookmarksRouter = require("../routes/bookmarks");

// Mock the DB pool
jest.mock("../db/connection", () => ({
  query: jest.fn(),
}));

const pool = require("../db/connection");

const app = express();
app.use(express.json());
app.use("/api/bookmarks", bookmarksRouter);

describe("GET /api/bookmarks", () => {
  it("returns list of bookmarks", async () => {
    pool.query.mockResolvedValueOnce([[
      { id: 1, story_id: 123, title: "Test Story", author: "user1", score: 100, comment_count: 10 }
    ]]);

    const res = await request(app).get("/api/bookmarks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].story_id).toBe(123);
  });

  it("returns empty array when no bookmarks", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/api/bookmarks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/bookmarks/search", () => {
  it("returns empty array when no query", async () => {
    const res = await request(app).get("/api/bookmarks/search");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("searches bookmarks by query", async () => {
    pool.query.mockResolvedValueOnce([[
      { id: 1, story_id: 456, title: "React Hooks Guide", author: "dev1" }
    ]]);

    const res = await request(app).get("/api/bookmarks/search?q=react");
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe("React Hooks Guide");
  });
});

describe("POST /api/bookmarks", () => {
  it("creates a bookmark successfully", async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 1 }]) // INSERT
      .mockResolvedValueOnce([[              // SELECT
        { id: 1, story_id: 789, title: "New Story", author: "user2", score: 50, comment_count: 5 }
      ]]);

    const res = await request(app)
      .post("/api/bookmarks")
      .send({ story_id: 789, title: "New Story", author: "user2", score: 50, comment_count: 5 });

    expect(res.status).toBe(201);
    expect(res.body.story_id).toBe(789);
  });

  it("returns 400 when story_id is missing", async () => {
    const res = await request(app)
      .post("/api/bookmarks")
      .send({ title: "Missing ID Story" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/bookmarks")
      .send({ story_id: 999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe("DELETE /api/bookmarks/:storyId", () => {
  it("deletes a bookmark successfully", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete("/api/bookmarks/123");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});