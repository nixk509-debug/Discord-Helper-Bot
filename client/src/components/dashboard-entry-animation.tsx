import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import heroArt from "@assets/hero-art.png";

export function DashboardEntryAnimation({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState("logo");

  const fullText = "ENTERING ARCHIVIST";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("eyes"), 500);
    const t2 = setTimeout(() => setPhase("scan"), 1000);
    const t3 = setTimeout(() => setPhase("text"), 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (phase !== "text") return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setText(fullText.slice(0, i + 1));
        i += 1;
        return;
      }

      clearInterval(interval);
      let blinkCount = 0;
      const cursorInterval = setInterval(() => {
        setShowCursor((current) => !current);
        blinkCount += 1;
        if (blinkCount >= 4) {
          clearInterval(cursorInterval);
          setTimeout(onComplete, 500);
        }
      }, 400);
    }, 50);

    return () => clearInterval(interval);
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#050608]">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(5,6,8,0.22), rgba(5,6,8,0.88)), url(${heroArt})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(177,18,38,0.2),transparent_36%),radial-gradient(circle_at_bottom,rgba(177,18,38,0.18),transparent_26%)]" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative flex flex-col items-center"
      >
        <div className="relative mb-8">
          {phase === "scan" ? (
            <motion.div
              initial={{ left: "-10%", opacity: 0 }}
              animate={{ left: "110%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1, ease: "linear" }}
              className="absolute top-1/2 z-20 h-[2px] w-full -translate-y-1/2 bg-[#FF2D4D] shadow-[0_0_15px_#FF2D4D]"
            />
          ) : null}

          <motion.img
            src={archivistLogo}
            alt="Archivist"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-32 w-32 object-contain drop-shadow-[0_0_30px_rgba(255,45,77,0.2)]"
          />

          <AnimatePresence>
            {phase !== "logo" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="mt-2 flex gap-8">
                  <div className="h-2 w-2 rounded-full bg-[#FF2D4D] shadow-[0_0_10px_#FF2D4D]" />
                  <div className="h-2 w-2 rounded-full bg-[#FF2D4D] shadow-[0_0_10px_#FF2D4D]" />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mb-2 h-8 stats-monospace flex items-center text-sm font-bold tracking-widest text-[#FF2D4D]">
          {text}
          {showCursor ? <span className="ml-1">[]</span> : null}
        </div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/36">Command workspace online</p>
      </motion.div>
    </div>
  );
}
