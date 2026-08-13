import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/useAuth";
import { Lock, Delete } from "lucide-react";

export const LockScreenModal = () => {
  const { user, unlockApp, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus hidden input on mount for keyboard PIN entry
    inputRef.current?.focus();
  }, []);

  const handleDigit = (digit) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");
    if (newPin.length >= 4) {
      setTimeout(() => attemptUnlock(newPin), 100);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError("");
  };

  const attemptUnlock = (inputPin) => {
    const result = unlockApp(inputPin);
    if (result.success) {
      setPin("");
      setError("");
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(result.error || "Incorrect PIN");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");

      if (newAttempts >= 5) {
        setError("Too many attempts. Please log in again.");
      }
    }
  };

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/98 backdrop-blur-md flex flex-col items-center justify-center px-4 text-white">
      
      {/* Lock icon */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
        <Lock className="w-8 h-8 text-emerald-400" />
      </div>

      <h2 className="text-xl font-extrabold mb-1">App Locked</h2>
      <p className="text-sm text-slate-400 mb-8">
        Enter your PIN to continue as <strong className="text-white">{user?.name}</strong>
      </p>

      {/* PIN dots */}
      <div className={`flex gap-3 mb-4 ${isShaking ? "animate-shake" : ""}`}>
        {[0,1,2,3,4,5].map(i => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
              i < pin.length
                ? "bg-emerald-400 border-emerald-400 scale-110"
                : "bg-transparent border-slate-500"
            }`}
          />
        ))}
      </div>

      {/* Error */}
      <div className="h-5 mb-4">
        {error && <p className="text-xs text-rose-400 font-semibold text-center">{error}</p>}
      </div>

      {/* Hidden input for hardware keyboard */}
      <input
        ref={inputRef}
        type="tel"
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
          setPin(val);
          if (val.length >= 4) setTimeout(() => attemptUnlock(val), 100);
        }}
        className="absolute opacity-0 w-0 h-0"
        aria-label="PIN input"
      />

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {digits.map((d, i) => {
          if (d === "") return <div key={i} />;
          if (d === "⌫") {
            return (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDelete}
                className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center"
                aria-label="Delete"
              >
                <Delete className="w-5 h-5 text-slate-300" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleDigit(d)}
              disabled={attempts >= 5}
              className="h-16 rounded-2xl bg-slate-800 hover:bg-emerald-600 active:scale-95 transition-all text-xl font-bold text-white disabled:opacity-40"
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Logout option after too many attempts */}
      {attempts >= 3 && (
        <button
          onClick={logout}
          className="mt-8 text-xs text-slate-500 hover:text-rose-400 transition-colors"
        >
          Forgot PIN? Sign out and log back in
        </button>
      )}
    </div>
  );
};
