"use client";

import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import HomePageContent from "../components/HomePageContent";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-4">Loading...</div>}>
        <HomePageContent />
      </Suspense>
    </>
  );
}