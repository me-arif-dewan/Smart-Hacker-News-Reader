"use client";

import { useState } from "react";
import { Story, addBookmark, removeBookmark } from "@/lib/api";

interface Props {
  story: Story;
  isBookmarked: boolean;
  onBookmarkChange: (id: number, added: boolean) => void;
}

export default function BookmarkButton({
  story,
  isBookmarked,
  onBookmarkChange,
}: Props) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      if (isBookmarked) {
        await removeBookmark(story.id);
        onBookmarkChange(story.id, false);
      } else {
        await addBookmark(story);
        onBookmarkChange(story.id, true);
      }
    } catch (err) {
      console.error("Bookmark error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      className={`text-lg shrink-0 transition-opacity ${
        loading ? "opacity-40" : "hover:opacity-70"
      } ${isBookmarked ? "text-yellow-400" : "text-gray-300"}`}
    >
      ★
    </button>
  );
}