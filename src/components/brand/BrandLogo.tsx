export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <svg className="size-7 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="5" y="6" width="22" height="21" rx="4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 12.5H27M10 4V9M22 4V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11 18H21M11 22H17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="23" cy="22" r="3.5" fill="var(--background)" stroke="currentColor" strokeWidth="1.2" />
        <path d="M23 20.5V22L24.2 23" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      {!compact && <span>Consultation Scheduler</span>}
    </span>
  );
}
