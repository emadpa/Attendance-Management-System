import React from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function AttendanceChart({ data }) {
  // Fallback mock data in case the backend data isn't ready yet
  const chartData =
    data && data.length > 0
      ? data
      : [
          { day: "Mon", present: 45, absent: 5 },
          { day: "Tue", present: 48, absent: 2 },
          { day: "Wed", present: 46, absent: 4 },
          { day: "Thu", present: 47, absent: 3 },
          { day: "Fri", present: 42, absent: 8 },
          { day: "Sat", present: 15, absent: 35 },
          { day: "Sun", present: 0, absent: 50 },
        ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-8 p-6 sm:p-8 bg-white border border-gray-200 rounded-sm shadow-sm"
    >
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-gray-400" />
        <div>
          <h3 className="text-lg font-serif font-medium">
            Weekly Attendance Trend
          </h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
            Last 7 Days Overview
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f3f4f6"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "4px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
            />
            <Line
              type="monotone"
              dataKey="present"
              name="Present"
              stroke="#059669"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="absent"
              name="Absent / Leave"
              stroke="#f87171"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
