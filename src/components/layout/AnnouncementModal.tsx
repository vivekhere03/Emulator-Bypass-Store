import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const AnnouncementModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Show modal if it hasn't been dismissed in this session
        const dismissed = sessionStorage.getItem("announcement_dismissed");
        if (!dismissed) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem("announcement_dismissed", "true");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-xl border border-border/50 bg-card p-6 shadow-2xl">
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-full p-1 transition-colors hover:bg-secondary"
                >
                    <X className="h-5 w-5 text-muted-foreground" />
                </button>

                <div className="mb-4 text-center">
                    <h2 className="text-xl font-bold">Important Update</h2>
                </div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-primary">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-8 w-8"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>

                    <h3 className="text-lg font-semibold">We Have fixed our Core System</h3>

                    <p className="text-sm text-muted-foreground">
                        Our System is back online and fully operational. If you have any questions or need
                        assistance, feel free to reach out to us on Telegram. We're here to help!
                    </p>

                    <Button className="w-full gap-2 font-bold" size="lg" asChild>
                        <a href="https://t.me/bypassexe" target="_blank" rel="noreferrer">
                            <MessageCircle className="h-5 w-5 fill-current" />
                            Chat Now
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementModal;
