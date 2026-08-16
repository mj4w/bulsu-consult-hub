import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Image
        src="/bulsu-consult-hub-icon.png"
        alt="BulSU Consult Hub"
        width={42}
        height={42}
        className="size-10 shrink-0 rounded-xl object-contain"
      />
      {!compact && <span className="hidden sm:inline">BulSU Consult Hub</span>}
    </span>
  );
}
