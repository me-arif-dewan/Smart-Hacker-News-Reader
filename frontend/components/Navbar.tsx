import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-orange-500 text-white px-4 py-2 flex items-center gap-6">
      <Link href="/" className="font-bold text-lg tracking-tight">
        HN Reader
      </Link>
      <Link href="/?type=top" className="text-sm hover:underline">
        Top
      </Link>
      <Link href="/?type=new" className="text-sm hover:underline">
        New
      </Link>
      <Link href="/?type=best" className="text-sm hover:underline">
        Best
      </Link>
      <Link href="/bookmarks" className="text-sm hover:underline ml-auto">
        ★ Bookmarks
      </Link>
    </nav>
  );
}