import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";

export function DashboardEntryAnimation({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState("logo"); // logo, eyes, scan, text, redirect

  const fullText = "ACCESSING ARCHIVE";

  useEffect(() => {
    // Phase 1: Logo scale
    const t1 = setTimeout(() => setPhase("eyes"), 500);
    // Phase 2: Eyes fade in (handled by motion)
    const t2 = setTimeout(() => setPhase("scan"), 1000);
    // Phase 3: Scan line
    const t3 = setTimeout(() => setPhase("text"), 1500);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (phase === "text") {
      let i = 0;
      const interval = setInterval(() => {
        if (i < fullText.length) {
          setText(fullText.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          // Blinking cursor twice
          let blinkCount = 0;
          const cursorInterval = setInterval(() => {
            setShowCursor(prev => !prev);
            blinkCount++;
            if (blinkCount >= 4) {
              clearInterval(cursorInterval);
              setTimeout(onComplete, 500);
            }
          }, 400);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B0D10] flex flex-col items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative flex flex-col items-center"
      >
        <div className="relative mb-8">
          {/* Scan Line */}
          {phase === "scan" && (
            <motion.div
              initial={{ left: "-10%", opacity: 0 }}
              animate={{ left: "110%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 w-full h-[2px] bg-[#FF2D4D] z-20 shadow-[0_0_15px_#FF2D4D]"
            />
          )}

          {/* Folder Logo */}
          <motion.img
            src={archivistLogo}
            alt="Archivist"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-32 h-32 object-contain"
          />

          {/* Eyes Overlay */}
          <AnimatePresence>
            {phase !== "logo" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                {/* Eyes are part of the logo image usually, but if we want specific glow: */}
                <div className="flex gap-8 mt-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF2D4D] shadow-[0_0_10px_#FF2D4D]" />
                  <div className="w-2 h-2 rounded-full bg-[#FF2D4D] shadow-[0_0_10px_#FF2D4D]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 stats-monospace text-[#FF2D4D] tracking-widest text-sm font-bold flex items-center">
          {text}
          {showCursor && <span className="ml-1">▮</span>}
        </div>
      </motion.div>
    </div>
  );
}
