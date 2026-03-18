"use client";

import Link from "next/link";
import { Story } from "@/lib/api";
import BookmarkButton from "./BookmarkButton";

function timeAgo(unix: number) {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  story: Story;
  index: number;
  bookmarkedIds: Set<number>;
  onBookmarkChange: (id: number, added: boolean) => void;
}

export default function StoryCard({
  story,
  index,
  bookmarkedIds,
  onBookmarkChange,
}: Props) {
  const domain = story.url
    ? new URL(story.url).hostname.replace("www.", "")
    : null;

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100">
      <span className="text-gray-400 text-sm w-6 text-right shrink-0 pt-0.5">
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {story.url ? (
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-900 hover:underline"
              >
                {story.title}
              </a>
            ) : (
              <span className="text-sm font-medium text-gray-900">
                {story.title}
              </span>
            )}
            {domain && (
              <span className="ml-2 text-xs text-gray-400">({domain})</span>
            )}
          </div>
          <BookmarkButton
            story={story}
            isBookmarked={bookmarkedIds.has(story.id)}
            onBookmarkChange={onBookmarkChange}
          />
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{story.score} pts</span>
          <span>by {story.author}</span>
          <span>{timeAgo(story.time)}</span>
          <Link
            href={`/story/${story.id}`}
            className="text-orange-500 hover:underline"
          >
            {story.comment_count} comments
          </Link>
        </div>
      </div>
    </div>
  );
}