import { useState } from 'react';

interface PatternThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function PatternThumbnail({ src, alt, className = '' }: PatternThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--color-accent)] ${className}`}
        aria-label={alt}
      >
        <svg
          viewBox="0 0 64 64"
          className="h-12 w-12 opacity-85"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="32" cy="34" r="18" />
          <path d="M18 24c8 2 18 10 24 20" />
          <path d="M15 34c10-4 22-4 34 2" />
          <path d="M24 18c2 10 2 22-4 31" />
          <path d="M44 20c5-4 10-7 13-11" />
          <path d="M55 7c2 1 2 4 0 5" />
        </svg>
        <span className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
          StitchCraft Yarn
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
