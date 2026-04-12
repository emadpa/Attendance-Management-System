import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "./ui/icons/iconPaths";
import Icon from "./ui/icons/Icon";

export default function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className={`
          fixed bottom-7 right-7 z-[999]
          flex items-center gap-2 max-w-[360px]
          px-5 py-3 rounded-xl text-sm font-medium
          shadow-[0_12px_32px_rgba(0,0,0,0.18)]
          ${
            toast.type === "success"
              ? "bg-slate-900 text-white"
              : "bg-red-50 text-red-600 border border-red-200"
          }
        `}
        >
          <span
            className={`flex-shrink-0 ${
              toast.type === "success" ? "text-green-500" : "text-red-500"
            }`}
          >
            <Icon
              d={toast.type === "success" ? Icons.check : Icons.alert}
              size={15}
            />
          </span>

          <span className="font-sans">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
