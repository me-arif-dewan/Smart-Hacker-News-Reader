import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

export interface Story {
  id: number;
  title: string;
  url: string | null;
  author: string;
  score: number;
  comment_count: number;
  time: number;
  type: string;
}

export interface Comment {
  id: number;
  text: string;
  author: string;
  time: number;
  depth: number;
  replies: Comment[];
}

export interface StoryDetail extends Story {
  text: string | null;
  comments: Comment[];
}

export interface Bookmark {
  id: number;
  story_id: number;
  title: string;
  url: string | null;
  author: string;
  score: number;
  comment_count: number;
  created_at: string;
}

export interface Summary {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  sentimentReason: string;
}

// HN
export const fetchStories = (type: string, page = 1) =>
  api.get(`/api/hn/stories/${type}?page=${page}`).then((r) => r.data);

export const fetchStory = (id: string) =>
  api.get(`/api/hn/item/${id}`).then((r) => r.data);

// Bookmarks
export const fetchBookmarks = () =>
  api.get("/api/bookmarks").then((r) => r.data);

export const searchBookmarks = (q: string) =>
  api.get(`/api/bookmarks/search?q=${encodeURIComponent(q)}`).then((r) => r.data);

export const addBookmark = (story: Story) =>
  api.post("/api/bookmarks", {
    story_id: story.id,
    title: story.title,
    url: story.url,
    author: story.author,
    score: story.score,
    comment_count: story.comment_count,
  }).then((r) => r.data);

export const removeBookmark = (storyId: number) =>
  api.delete(`/api/bookmarks/${storyId}`).then((r) => r.data);

// Summarize
export const summarizeDiscussion = (
  title: string,
  url: string | null,
  comments: Comment[]
) =>
  api.post("/api/summarize", { title, url, comments }).then((r) => r.data);