import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Lock, Phone, Mail, User, Store, ShieldCheck, ArrowRight, KeyRound, Sparkles, RefreshCw, CheckCircle2, ArrowLeft } from "lucide-react";

export const LoginView = () => {
  const { login, register, forgotPassword, resetPassword, loginAsDemo, authError, isLoading, setAuthError } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'register' | 'forgot' | 'reset'

  // Form states
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [identifier, setIdentifier] = useState(""); // Email or Phone for Login / Forgot / Reset
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot / Reset Password state
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [generatedOtpNotice, setGeneratedOtpNotice] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSuccessMsg("");
    await login(identifier.trim(), password.trim());
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSuccessMsg("");
    await register({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: password.trim(),
      shopName: shopName.trim()
    });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSuccessMsg("");
    setGeneratedOtpNotice("");

    const res = await forgotPassword(identifier.trim());
    if (res.success) {
      setSuccessMsg(res.message);
      if (res.otp) {
        setGeneratedOtpNotice(res.otp);
        setOtp(res.otp); // Auto fill for easy testing
      }
      setMode("reset");
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSuccessMsg("");

    const res = await resetPassword({
      identifier: identifier.trim(),
      otp: otp.trim(),
      newPassword: newPassword.trim()
    });

    if (res.success) {
      setSuccessMsg("🎉 Password reset successfully! Please log in with your new password.");
      setPassword(newPassword.trim());
      setNewPassword("");
      setOtp("");
      setMode("login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 selection:bg-emerald-500 selection:text-white">
      
      <div className="w-full max-w-md space-y-6">
        
        {/* App Logo & Title Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-2xl animate-pulse">
            <Lock className="w-8 h-8" />
          </div>

          <h1 className="font-extrabold text-2xl tracking-tight text-white">
            Digital Khata Book 📙
          </h1>
          <p className="text-xs text-slate-400">
            Secure Digital Udhar, Cashbook & Roommate Duty Ledger
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl p-6 border border-slate-700/80 shadow-2xl space-y-5">
          
          {/* Mode Switcher Pills (Login vs Register) */}
          {(mode === "login" || mode === "register") && (
            <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1 rounded-2xl text-xs font-bold border border-slate-700/50">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setAuthError("");
                  setSuccessMsg("");
                }}
                className={`py-2.5 rounded-xl transition-all ${
                  mode === "login"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setAuthError("");
                  setSuccessMsg("");
                }}
                className={`py-2.5 rounded-xl transition-all ${
                  mode === "register"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                New Account
              </button>
            </div>
          )}

          {/* Forgot / Reset Navigation Back Button */}
          {(mode === "forgot" || mode === "reset") && (
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setAuthError("");
                  setSuccessMsg("");
                }}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
              <span className="text-xs font-extrabold text-emerald-400">
                {mode === "forgot" ? "Forgot Password" : "Reset Password"}
              </span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Alert Box */}
          {authError && (
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-2xl text-xs font-semibold text-center">
              {authError}
            </div>
          )}

          {/* Generated OTP Highlight Notice Box */}
          {generatedOtpNotice && mode === "reset" && (
            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-200 p-3.5 rounded-2xl text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Reset OTP Code Generated!</span>
              </p>
              <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl font-mono text-lg font-black text-amber-400 border border-amber-500/30">
                <span>{generatedOtpNotice}</span>
                <span className="text-[10px] text-slate-400 font-sans font-normal">(Auto-filled)</span>
              </div>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Address or Mobile Number *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="name@example.com or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Password / PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setAuthError("");
                      setSuccessMsg("");
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim() || !password.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
              >
                <span>{isLoading ? "Signing in..." : "Secure Login"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Shop / Business Name (Optional)
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Sharma Store or Flat 204"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Password (At least 4 characters) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Set a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || (!email.trim() && !phone.trim()) || !name.trim() || !password.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 mt-1"
              >
                <span>{isLoading ? "Creating..." : "Create Free Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your registered <strong className="text-slate-200">Email Address</strong> or <strong className="text-slate-200">Mobile Phone</strong>. We will generate a 6-digit OTP code to reset your password.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Address or Mobile Number *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="name@example.com or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
              >
                <span>{isLoading ? "Generating OTP..." : "Get Reset OTP Code"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setAuthError(""); }}
                  className="text-xs text-emerald-400 hover:underline font-semibold"
                >
                  Already have an OTP code? Reset Password →
                </button>
              </div>
            </form>
          )}

          {/* 4. RESET PASSWORD FORM */}
          {mode === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Registered Email or Phone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="name@example.com or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  6-Digit Reset OTP Code *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 849201"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-base font-mono font-bold tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Set new password (min 4 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim() || otp.length < 6 || !newPassword.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 mt-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isLoading ? "Resetting..." : "Confirm & Set New Password"}</span>
              </button>
            </form>
          )}

          {/* Quick Demo Login Option */}
          {(mode === "login" || mode === "register") && (
            <div className="border-t border-slate-700/60 pt-4">
              <button
                type="button"
                onClick={loginAsDemo}
                className="w-full bg-slate-700/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold py-2.5 rounded-xl border border-slate-600 text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Quick Demo Login (1-Click Test Access)</span>
              </button>
            </div>
          )}

        </div>

        {/* Security Footer */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>256-Bit Encrypted Secure Database Access</span>
        </div>

      </div>

    </div>
  );
};
