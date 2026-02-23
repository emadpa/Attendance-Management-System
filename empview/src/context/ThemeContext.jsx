import React, {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
} from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Pure initializer: only calculates state, no DOM manipulation
  const [isDark, setIsDark] = useState(() => {
    // Safety check for SSR (optional but highly recommended)
    if (typeof window === "undefined") return false;

    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  // useLayoutEffect runs BEFORE the browser paints the screen,
  // preventing a flicker of the wrong theme.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("theme", isDark ? "dark" : "light");

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
