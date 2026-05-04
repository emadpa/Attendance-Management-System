import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useState } from "react";
import { useAuth } from "../App";

import { PORT } from "../constants/port";
const API = `http://localhost:${PORT}/api`;

export default function LoginPage() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true },
      );
      setUser(data);
      nav("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Main Container */}
      <div className="min-h-screen flex bg-slate-50 font-sans">
        {/* ── Left Panel ── */}
        <div className="hidden md:flex w-[52%] flex-col justify-center items-center px-14 py-12 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
          {/* Blobs */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.25)_0%,transparent_70%)]" />
          <div className="absolute bottom-[10%] -left-16 w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,transparent_70%)]" />

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:40px_40px]" />

          {/* Content */}
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-indigo-400 text-[11px] tracking-[0.16em] uppercase font-semibold mb-4">
                Workforce Management
              </p>

              <h1 className="text-white font-serif font-bold leading-tight mb-5 text-[clamp(32px,3.5vw,52px)]">
                Time well tracked <br />
                is work <br />
                <span className="text-indigo-400">well done.</span>
              </h1>

              <p className="text-slate-400 text-[15px] leading-relaxed max-w-[380px]">
                Your all-in-one portal for attendance, leave management, and
                workforce analytics.
              </p>
            </motion.div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="w-full max-w-md"
          >
            {/* Heading */}
            <div className="mb-9">
              <h2 className="text-2xl font-bold text-slate-900 font-serif mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-slate-400">
                Sign in to access your workspace
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 tracking-widest uppercase mb-2">
                  Employee Email
                </label>

                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused("")}
                  placeholder="employee@example.com"
                  className={`w-full px-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all
                ${
                  focused === "email"
                    ? "border-[1.5px] border-indigo-500 bg-indigo-50 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                    : "border-[1.5px] border-slate-200 bg-slate-50"
                }`}
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase">
                    Password
                  </label>
                </div>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused("")}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all
                ${
                  focused === "password"
                    ? "border-[1.5px] border-indigo-500 bg-indigo-50 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                    : "border-[1.5px] border-slate-200 bg-slate-50"
                }`}
                />
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                whileHover={{
                  scale: 1.01,
                  boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
                }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className={`w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all
              ${
                isLoading
                  ? "bg-indigo-300 cursor-not-allowed"
                  : "bg-gradient-to-br from-indigo-500 to-purple-500"
              }`}
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In →"
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
}
