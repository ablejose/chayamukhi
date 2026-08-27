import type { Manifest } from "@/lib/collections";
export default function AnnouncementBar({ announcement }: { announcement: Manifest["announcement"] }) {
  if (!announcement?.active || !announcement.text) return null;
  return (
    <div className="bg-ink px-4 py-2 text-center text-[11px] uppercase tracking-[0.15em] text-white">
      {announcement.text}
    </div>
  );
}
