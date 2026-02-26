import { motion } from "framer-motion";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0D10] text-foreground p-6">
      <div className="relative mb-8 group">
        <img 
          src={archivistLogo} 
          alt="Archivist" 
          className="w-32 h-32 object-contain opacity-80" 
        />
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 5 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="flex gap-8 mt-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF2D4D] shadow-[0_0_12px_#FF2D4D]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF2D4D] shadow-[0_0_12px_#FF2D4D]" />
          </div>
        </motion.div>
      </div>

      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-display font-extrabold tracking-widest text-[#FF2D4D]">
          ARCHIVE NOT FOUND
        </h1>
        <p className="text-muted-foreground stats-monospace text-sm leading-relaxed">
          The requested file does not exist in this index.
        </p>
      </div>

      <Button asChild variant="outline" className="mt-12 border-white/10 hover:bg-white/5 stats-monospace text-xs uppercase tracking-widest">
        <Link href="/">Return to Index</Link>
      </Button>
    </div>
  );
}
