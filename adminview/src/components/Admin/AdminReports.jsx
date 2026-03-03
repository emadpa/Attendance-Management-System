import React, { useState, useRef } from "react";
import { AdminLayout } from "./AdminLayout";
import { motion } from "framer-motion";
import {
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Toast, useToast } from "../shared/Toast";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

// --- DUMMY DATA ---
const employeeDistributionData = [
  { name: "Computer Science", value: 85 },
  { name: "Information Tech", value: 45 },
  { name: "Human Resources", value: 12 },
  { name: "Administration", value: 8 },
  { name: "Finance", value: 10 },
];

const leaveUsageData = [
  { name: "Sick Leave", daysUsed: 145 },
  { name: "Casual Leave", daysUsed: 210 },
  { name: "Annual Leave", daysUsed: 320 },
  { name: "Maternity", daysUsed: 45 },
  { name: "Unpaid", daysUsed: 80 },
];

// ✅ Professional, sophisticated color palette
const COLORS = ["#0f172a", "#6366f1", "#14b8a6", "#f59e0b", "#fb7185"];

// ✅ Custom Tooltip for Bar Chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-lg p-3 text-sm min-w-[120px]">
        <p className="font-medium text-gray-500 mb-2 uppercase tracking-wider text-[10px]">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700 font-medium">{entry.name}</span>
            </div>
            <span className="font-mono font-semibold text-gray-900">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ✅ Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-lg p-3 text-sm min-w-[150px]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: payload[0].payload.fill }}
            />
            <span className="text-gray-700 font-medium">{payload[0].name}</span>
          </div>
          <span className="font-mono font-semibold text-gray-900">
            {payload[0].value}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function AdminReports() {
  const { toast, showToast, hideToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  const handleExport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const imgData = await toPng(reportRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.setFontSize(16);
      pdf.text("Organizational Reports & Analytics", 10, 15);
      pdf.addImage(imgData, "PNG", 0, 25, pdfWidth, pdfHeight);
      pdf.save("HR_Reports_Export.pdf");

      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("PDF Export Error:", error);
      showToast("Failed to generate PDF.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout
      title="Reports & Analytics"
      description="Deep dive into organizational data, attendance trends, and leave analytics."
      actions={
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-sm text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isExporting ? "Generating PDF..." : "Export to PDF"}
        </button>
      }
    >
      <Toast {...toast} onClose={hideToast} />

      <div ref={reportRef} className="bg-gray-50 p-4 rounded-md">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* 1. Employee Distribution Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 sm:p-8 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gray-50 rounded-lg">
                <PieChartIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Employee Distribution
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Headcount by Department
                </p>
              </div>
            </div>

            <div className="h-[300px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeeDistributionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80} /* ✅ Thinner, sleeker donut ring */
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#ffffff" /* ✅ White borders between slices */
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {employeeDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: "12px",
                      color: "#475569",
                      paddingTop: "20px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* 2. Leave Type Usage Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-6 sm:p-8 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gray-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Leave Type Usage
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Total Days Consumed (YTD)
                </p>
              </div>
            </div>

            <div className="h-[300px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leaveUsageData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  barSize={32} /* ✅ Thinner, elegant bars */
                >
                  <CartesianGrid
                    strokeDasharray="4 4" /* ✅ Softer, wider dashes */
                    vertical={false} /* ✅ Horizontal grids only */
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  />
                  <Tooltip
                    cursor={{
                      fill: "#f8fafc",
                    }} /* ✅ Softer hover background */
                    content={<CustomBarTooltip />}
                  />
                  <Bar
                    dataKey="daysUsed"
                    name="Days Used"
                    fill="#0f172a" /* ✅ Deep slate/black looks premium */
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
