"use client";

import { createContext, useContext } from "react";
import type { ChapterContextValue } from "@/lib/types";

const ChapterContext = createContext<ChapterContextValue>(null);

export function ChapterProvider({
  children,
  value,
}: Readonly<{
  children: React.ReactNode;
  value: ChapterContextValue;
}>) {
  return (
    <ChapterContext.Provider value={value}>{children}</ChapterContext.Provider>
  );
}

export function useChapter() {
  return useContext(ChapterContext);
}
