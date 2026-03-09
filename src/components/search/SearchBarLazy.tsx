// src/components/search/SearchBarLazy.tsx
"use client";

import dynamic from "next/dynamic";

const SearchBar = dynamic(() => import("./SearchBar"), {
  ssr: false,
  loading: () => <div style={{ height: 72 }} aria-hidden="true" />,
});

export default function SearchBarLazy() {
  return <SearchBar />;
}