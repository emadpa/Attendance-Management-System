import { useState, useEffect } from "react";

export function useIsMobile(bp = 768) {
  const [v, setV] = useState(
    typeof window !== "undefined" ? window.innerWidth < bp : false,
  );
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
}
