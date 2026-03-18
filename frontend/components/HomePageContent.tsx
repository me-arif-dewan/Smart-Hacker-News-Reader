"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchStories, fetchBookmarks, Story, Bookmark } from "@/lib/api";
import StoryCard from "@/components/StoryCard";

export default function HomePageContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "top";

  const [stories, setStories] = useState<Story[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  const loadBookmarks = useCallback(async () => {
    try {
      const bookmarks: Bookmark[] = await fetchBookmarks();
      setBookmarkedIds(new Set(bookmarks.map((b) => b.story_id)));
    } catch {}
  }, []);

  const loadStories = useCallback(
    async (pageNum: number, reset: boolean) => {
      setLoading(true);
      try {
        const data = await fetchStories(type, pageNum);
        setStories((prev) => (reset ? data.stories : [...prev, ...data.stories]));
        setHasMore(data.hasMore);
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [type]
  );

  useEffect(() => {
    setPage(1);
    setStories([]);
    loadStories(1, true);
    loadBookmarks();
  }, [type, loadStories, loadBookmarks]);

  const handleBookmarkChange = (id: number, added: boolean) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (added) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadStories(next, false);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-4">
      <div className="flex gap-2 mb-4 text-sm">
        {["top", "new", "best"].map((t) => (
          <a
            key={t}
            href={`/?type=${t}`}
            className={`px-3 py-1 rounded capitalize ${
              type === t
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t}
          </a>
        ))}
      </div>

      {stories.map((story, i) => (
        <StoryCard
          key={story.id}
          story={story}
          index={i}
          bookmarkedIds={bookmarkedIds}
          onBookmarkChange={handleBookmarkChange}
        />
      ))}

      {loading && (
        <p className="text-center text-gray-400 py-6 text-sm">Loading...</p>
      )}

      {!loading && hasMore && (
        <button
          onClick={loadMore}
          className="w-full mt-4 py-2 text-sm text-orange-500 hover:underline"
        >
          Load more
        </button>
      )}
    </main>
  );
}
