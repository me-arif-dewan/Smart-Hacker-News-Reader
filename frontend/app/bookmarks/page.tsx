"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchBookmarks,
  searchBookmarks,
  removeBookmark,
  Bookmark,
} from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks()
      .then(setBookmarks)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim() === "") {
      const all = await fetchBookmarks();
      setBookmarks(all);
    } else {
      const results = await searchBookmarks(q);
      setBookmarks(results);
    }
  };

  const handleRemove = async (storyId: number) => {
    await removeBookmark(storyId);
    setBookmarks((prev) => prev.filter((b) => b.story_id !== storyId));
  };

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-4">
        <h1 className="text-lg font-semibold text-gray-800 mb-4">Bookmarks</h1>

        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search bookmarks..."
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />

        {loading && (
          <p className="text-gray-400 text-sm">Loading bookmarks...</p>
        )}

        {!loading && bookmarks.length === 0 && (
          <p className="text-gray-400 text-sm">
            {query ? "No results found." : "No bookmarks yet. Star a story to save it."}
          </p>
        )}

        {bookmarks.map((b) => (
          <div
            key={b.story_id}
            className="flex gap-3 py-3 border-b border-gray-100"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 hover:underline"
                    >
                      {b.title}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {b.title}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(b.story_id)}
                  className="text-gray-300 hover:text-red-400 text-lg shrink-0"
                  title="Remove bookmark"
                >
                  ★
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{b.score} pts</span>
                <span>by {b.author}</span>
                <Link
                  href={`/story/${b.story_id}`}
                  className="text-orange-500 hover:underline"
                >
                  {b.comment_count} comments
                </Link>
              </div>
            </div>
          </div>
        ))}
      </main>
    </>
  );
}