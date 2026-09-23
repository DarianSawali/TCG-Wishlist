"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* eslint-disable @next/next/no-img-element -- card images are dynamic API assets */

export function CardImagePreview({
  src,
  fallbackSrc,
  alt,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("preview-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("preview-open");
    };
  }, [open]);

  const image = (
    <img
      src={displaySrc}
      alt={alt}
      onError={() => {
        if (fallbackSrc && displaySrc !== fallbackSrc) setDisplaySrc(fallbackSrc);
      }}
    />
  );

  return (
    <>
      <button
        type="button"
        className="card-preview-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge ${alt}`}
        title="View larger card"
      >
        {image}
      </button>
      {open &&
        createPortal(
          <div
            className="card-preview-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onMouseDown={() => setOpen(false)}
          >
            <button
              type="button"
              className="card-preview-close"
              onClick={() => setOpen(false)}
              aria-label="Close card preview"
            >
              ×
            </button>
            <div
              className="card-preview-stage"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <img src={displaySrc} alt={alt} />
              <span>{alt}</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
