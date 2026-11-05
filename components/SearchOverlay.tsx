"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import SearchBox from "./SearchBox";
import { IconClose } from "./icons";

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  // Portalled to <body>: the sticky header uses backdrop-blur, which would otherwise make
  // this "fixed" overlay size itself to the header and leave the page undimmed.
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 top-0 bg-white px-4 py-5 sm:p-6">
        <div className="mx-auto flex max-w-3xl items-start gap-3">
          <div className="min-w-0 flex-1">
            <SearchBox variant="overlay" autoFocus onDone={onClose} />
          </div>
          <button aria-label="Close search" onClick={onClose} className="mt-2 shrink-0"><IconClose /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
