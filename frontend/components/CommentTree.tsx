"use client";

import { useState } from "react";
import { Comment } from "@/lib/api";

function decodeHtml(html: string) {
  // Decode entities first, then process tags
  const decoded = html
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x60;/gi, "`")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));

  // Now process tags on fully decoded string
  return decoded
    .replace(/<p>/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>.*?<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function timeAgo(unix: number) {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentNode({ comment }: { comment: Comment }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border-l-2 border-gray-100 pl-3 mt-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span className="font-medium text-gray-700">{comment.author}</span>
        <span>{timeAgo(comment.time)}</span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-600"
        >
          [{collapsed ? "+" : "−"}]
        </button>
      </div>
      {!collapsed && (
        <>
          <div
            className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: comment.text
                .replace(/&#x2F;/gi, "/")
                .replace(/&#x27;/gi, "'")
                .replace(/&#x60;/gi, "`")
                .replace(/&amp;/g, "&")
                .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
                .replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:underline" ')
            }}
          />
          {comment.replies.length > 0 && (
            <div className="ml-2">
              {comment.replies.map((reply) => (
                <CommentNode key={reply.id} comment={reply} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CommentTree({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return <p className="text-gray-500 text-sm mt-4">No comments yet.</p>;
  }

  return (
    <div className="mt-4">
      {comments.map((comment) => (
        <CommentNode key={comment.id} comment={comment} />
      ))}
    </div>
  );
}