import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { useState } from "react";
import { useAuth } from "../App";

export default function LoginPage() {
  const { isDark, toggleTheme } = useTheme();
  const nav = useNavigate();
  // Inside the component, add state:
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data } = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password },
        { withCredentials: true }, // equivalent of credentials: "include"
      );
      // console.log(data);

      setUser(data);
      nav("/Dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ✅ FIX: Changed lg:flex-row to md:flex-row to trigger side-by-side on smaller screens
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Left Panel */}
      {/* ✅ FIX: Changed lg:w-1/2 to md:w-1/2 */}
      <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-800 flex flex-col justify-between p-8 md:p-12 lg:p-16 relative overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 transition-colors duration-300">
        {/* Header & Theme Toggle */}
        <div className="relative z-10 flex justify-between items-center w-full">
          <div className="text-xl font-serif font-bold tracking-tight text-black dark:text-white">
            Company
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Main Editorial Content */}
        <div className="relative z-10 max-w-lg mt-12 mb-12 md:mt-0 md:mb-0">
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-serif leading-tight mb-6 text-black dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Time well tracked is work well done.
          </motion.h1>
          <p className="text-gray-600 dark:text-gray-400 font-sans text-base lg:text-lg">
            Efficiency is the refined essence of productivity.
          </p>
        </div>

        {/* Footer Text */}
        <div className="relative z-10 hidden md:block">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            © 2024 INC.
          </p>
        </div>

        {/* Decorative Element */}
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-black/5 dark:from-white/5 to-transparent pointer-events-none z-0"></div>
      </div>

      {/* Right Panel - Login Form */}
      {/* ✅ FIX: Changed lg:w-1/2 to md:w-1/2 */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white dark:bg-gray-900 transition-colors duration-300">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-2 text-black dark:text-white">
              Welcome back
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-sans">
              Sign in to access your workspace
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide font-sans">
                Employee Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-md text-base font-sans
                           bg-white dark:bg-gray-800 text-black dark:text-white
                           focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="employee@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide font-sans">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-md text-base font-sans
                           bg-white dark:bg-gray-800 text-black dark:text-white
                           focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center -mt-2">{error}</p>
            )}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-md text-sm font-bold
                         hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200
                         uppercase tracking-widest font-sans mt-2"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <a
              href="#"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors font-sans border-b border-transparent hover:border-black dark:hover:border-white pb-0.5"
            >
              Forgot your password?
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
