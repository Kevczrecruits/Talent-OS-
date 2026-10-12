import React, { useState, useEffect, useRef } from "react";
import { Lock, X } from "lucide-react";

interface PasscodeDialogProps {
  open: boolean;
  error: string | null;
  onSubmit: (code: string) => void;
  onClose: () => void;
}

export default function PasscodeDialog({ open, error, onSubmit, onClose }: PasscodeDialogProps) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      // focus the input once the dialog mounts
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open ]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSubmit(code.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glass rounded-3xl p-8 w-full max-w-sm shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-ink transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-2xl bg-[#00B4D8]/10 border border-[#00B4D8]/25 flex items-center justify-center text-[#04748c] mb-4">
          <Lock className="w-5 h-5" />
        </div>

        <h3 className="font-extrabold text-2xl text-ink lowercase tracking-tight">unlock search</h3>
        <p className="font-mono text-[11px] text-muted mt-1.5 leading-relaxed lowercase">
          live searching is passcode-protected to keep api usage in check. enter the code to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            ref={inputRef}
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="passcode"
            autoComplete="off"
            className="w-full bg-white/85 text-sm text-ink placeholder-muted/70 rounded-2xl border border-ink/10 focus:border-[#00B4D8] focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/20 px-4 py-3 transition-all font-mono"
          />
          {error && (
            <p className="font-mono text-[11px] text-red-600 lowercase">{error}</p>
          )}
          <button
            type="submit"
            disabled={!code.trim()}
            className={`w-full py-3 px-4 rounded-full font-mono font-bold text-sm transition-all duration-200 ${
              !code.trim()
                ? "bg-ink/5 text-muted/60 border border-ink/10 cursor-not-allowed"
                : "bg-ink text-white hover:bg-[#1a2233] active:scale-[0.99] cursor-pointer"
            }`}
          >
            unlock + search
          </button>
        </form>
      </div>
    </div>
  );
}
