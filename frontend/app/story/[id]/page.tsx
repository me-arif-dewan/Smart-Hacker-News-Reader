"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchStory, fetchBookmarks, StoryDetail, Bookmark } from "@/lib/api";
import CommentTree from "@/components/CommentTree";
import SummaryPanel from "@/components/SummaryPanel";
import BookmarkButton from "@/components/BookmarkButton";
import Navbar from "@/components/Navbar";

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchStory(id).then(setStory).finally(() => setLoading(false));
    fetchBookmarks().then((bookmarks: Bookmark[]) =>
      setBookmarkedIds(new Set(bookmarks.map((b) => b.story_id)))
    );
  }, [id]);

  const handleBookmarkChange = (storyId: number, added: boolean) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (added) {
        next.add(storyId);
      } else {
        next.delete(storyId);
      }
      return next;
    });
  };

  if (loading)
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8 text-gray-500 text-sm">
          Loading story...
        </main>
      </>
    );

  if (!story)
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8 text-red-500 text-sm">
          Story not found.
        </main>
      </>
    );

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-4">
        <div className="mb-4">
          <div className="flex items-start gap-2">
            <h1 className="text-lg font-semibold text-gray-900 flex-1">
              {story.url ? (
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {story.title}
                </a>
              ) : (
                story.title
              )}
            </h1>
            <BookmarkButton
              story={story}
              isBookmarked={bookmarkedIds.has(story.id)}
              onBookmarkChange={handleBookmarkChange}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {story.score} pts · by {story.author} · {story.comment_count} comments
          </p>
          {story.text && (
            <div
              className="mt-3 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: story.text
                  .replace(/&#x2F;/gi, "/")
                  .replace(/&#x27;/gi, "'")
                  .replace(/&#x60;/gi, "`")
                  .replace(/&amp;/g, "&")
                  .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
                  // Make links open in new tab
                  .replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:underline" ')
              }}
            />
          )}
        </div>

        <SummaryPanel
          storyId={story.id}
          title={story.title}
          commentCount={story.comment_count}
        />

        <CommentTree comments={story.comments} />
      </main>
    </>
  );
}