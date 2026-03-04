import React, { useState } from "react";
import { Bell, User, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function Header({ name, organizationName }) {
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-4 lg:py-6 flex items-center justify-between">
        {/* Logo */}
        <div className="text-lg sm:text-xl font-serif font-bold tracking-tight dark:text-white">
          {organizationName}
        </div>

        {/* Desktop Welcome Text */}
        <div className="hidden md:block text-sm text-gray-400 font-sans">
          Welcome back,{" "}
          <span className="text-black dark:text-white font-medium">{name}</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications - Hidden on mobile */}
          <button className="hidden sm:block relative group text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 transform translate-x-1 -translate-y-1"></span>
          </button>

          {/* Profile */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 dark:bg-gray-700 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-black dark:hover:bg-gray-600 transition-colors">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
