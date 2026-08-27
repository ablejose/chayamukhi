import { BRAND } from "@/config/brand";
import { IconWhatsApp } from "./icons";
export default function WhatsAppButton() {
  return (
    <a href={`https://wa.me/${BRAND.whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105">
      <IconWhatsApp />
    </a>
  );
}
