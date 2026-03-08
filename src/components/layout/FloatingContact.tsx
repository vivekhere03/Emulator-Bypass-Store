import { MessageCircle, Phone } from "lucide-react";

export const FloatingContact = () => {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4">
            {/* Telegram Button */}
            <a
                href="https://t.me/bypassexe"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#0088cc] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl hover:bg-[#0077b3] relative"
                aria-label="Contact on Telegram"
            >
                <span className="absolute -top-1 -right-1 flex h-4 w-8 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
                    NEW
                </span>
                <MessageCircle className="h-6 w-6 fill-current" />
                <div className="absolute right-full mr-3 hidden rounded bg-popover px-2 py-1 text-sm text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:block group-hover:opacity-100 whitespace-nowrap">
                    Telegram Support
                </div>
            </a>

            {/* WhatsApp Button */}
            <a
                href="https://wa.me/212785507718"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl hover:bg-[#128c7e] relative"
                aria-label="Contact on WhatsApp"
            >
                <Phone className="h-6 w-6 fill-current" />
                <div className="absolute right-full mr-3 hidden rounded bg-popover px-2 py-1 text-sm text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:block group-hover:opacity-100 whitespace-nowrap">
                    WhatsApp Support
                </div>
            </a>
        </div>
    );
};
