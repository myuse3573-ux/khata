import React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export const Toast = ({ message, type = "success" }) => {
  if (!message) return null;

  const isSuccess = type === "success";
  const isError = type === "error";

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up max-w-sm w-11/12">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${
          isSuccess
            ? "bg-slate-900 text-emerald-400 border-slate-800"
            : isError
            ? "bg-slate-900 text-rose-400 border-slate-800"
            : "bg-slate-900 text-sky-400 border-slate-800"
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
        <span className="flex-1">{message}</span>
      </div>
    </div>
  );
};
