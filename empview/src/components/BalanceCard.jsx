import { motion } from "framer-motion";

export default function BalanceCard({
  name,
  allowed,
  used,
  remaining,
  isPaid,
  accent,
  index,
}) {
  const pct = allowed > 0 ? Math.round((remaining / allowed) * 100) : 0;
  const low = pct <= 25;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.09)" }}
      className="relative bg-white rounded-2xl px-5 py-[18px] border border-slate-100 shadow-sm overflow-hidden cursor-default"
    >
      {/* Accent blob */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.08]"
        style={{ background: accent }}
      />

      {/* Top section */}
      <div className="flex justify-between items-start mb-3.5">
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-1.5">{name}</p>

          <span
            className={`
            text-[10px] font-semibold px-2 py-[2px] rounded-full border
            ${
              isPaid
                ? "bg-green-50 text-green-500 border-green-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }
          `}
          >
            {isPaid ? "Paid" : "Unpaid"}
          </span>
        </div>

        <div className="text-right">
          <p
            className={`text-3xl font-bold leading-none font-serif ${
              low ? "text-red-500" : "text-slate-900"
            }`}
          >
            {remaining}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">of {allowed} days</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[5px] bg-slate-100 rounded-full overflow-hidden mb-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{
            duration: 0.9,
            ease: "easeOut",
            delay: index * 0.08,
          }}
          className="h-full rounded-full"
          style={{ background: low ? "#ef4444" : accent }}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">{used} used</span>
        <span
          className={`${low ? "text-red-500 font-semibold" : "text-slate-400"}`}
        >
          {pct}% left
        </span>
      </div>
    </motion.div>
  );
}
