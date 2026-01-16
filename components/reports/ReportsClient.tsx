"use client";

import { useState, useEffect } from "react";
import ReportsHeader from "@/components/reports/ReportsHeader";
import GroupCards from "@/components/reports/GroupCards";
import DynamicChart from "@/components/reports/DynamicChart";
import GeneralReport from "@/components/reports/GeneralReport";
import LoadingWrapper from "@/components/layout/LoadingWrapper";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ReportsClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [viewMode, setViewMode] = useState<"groups" | "general">("groups");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/reports");
        const json = await res.json();
        if (res.ok) {
          setData(json);
          if (json.groups.length > 0) setSelectedGroup(json.groups[0]);
        }
      } catch (error) {
        toast.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get frequency display text
  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      default:
        return frequency;
    }
  };

  // --- Universal Export Handler ---
  const handleExport = async (
    format: "pdf" | "excel",
    type: "group" | "general",
    id?: string
  ) => {
    const toastId = toast.loading("Generating report...");

    try {
      // Determine ID: If explicit ID passed (from modal) use it, else use selected group or user ID
      const targetId =
        id || (type === "group" ? selectedGroup?.id : data?.general?.id);

      // 1. Fetch Real Data
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: targetId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const { title, meta, data: rows } = json;

      if (!rows || rows.length === 0) {
        toast.error("No data available to export", { id: toastId });
        return;
      }

      // 2. Generate PDF
      if (format === "pdf") {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setTextColor(30, 58, 138);
        doc.text(title, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(meta, 14, 28);

        // Dynamic Columns
        const columns = Object.keys(rows[0]).map((key) => ({
          header: key,
          dataKey: key,
        }));

        autoTable(doc, {
          startY: 35,
          head: [columns.map((c) => c.header)],
          body: rows.map((r: any) => Object.values(r)),
          headStyles: { fillColor: [30, 58, 138], textColor: 255 },
          theme: "grid",
          styles: { fontSize: 9 },
        });

        doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
        toast.success("PDF Downloaded", { id: toastId });
      }

      // 3. Generate Excel
      else if (format === "excel") {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, `${title.replace(/\s+/g, "_")}.xlsx`);
        toast.success("Excel Downloaded", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Export failed", { id: toastId });
    }
  };

  return (
    <LoadingWrapper pageTitle="Reports & Analytics">
      <div className="space-y-8">
        {/* Header passes 'groups' for admin check and 'onExport' logic */}
        <ReportsHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          onExport={handleExport}
          groups={data?.groups || []}
        />

        {data && viewMode === "groups" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Group Cards List */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-bold text-gray-700 mb-2">Select a Group</h3>
              <GroupCards
                groups={data.groups}
                selectedId={selectedGroup?.id}
                onSelect={setSelectedGroup}
              />
            </div>

            {/* Right: Analysis Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {selectedGroup ? (
                // In the ReportsClient.tsx file, update the chart section:
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedGroup.name} Analysis
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">
                          Role:{" "}
                          <span className="uppercase font-semibold text-primary">
                            {selectedGroup.role}
                          </span>
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">
                          {getFrequencyText(selectedGroup.frequency)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Cycles: {selectedGroup.currentCycle}/
                          {selectedGroup.duration}
                        </span>
                      </div>
                    </div>

                    <select
                      className="border rounded-lg px-3 py-1.5 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as any)}
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                    </select>
                  </div>

                  {/* Chart Container - Fixed height */}
                  <div className="h-[300px] flex items-center justify-center">
                    <DynamicChart type={chartType} data={selectedGroup} />
                  </div>

                  {/* Timeline Info */}
                  <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>
                        Timeline based on {selectedGroup.frequency} cycles
                      </span>
                      <span className="font-medium">
                        {selectedGroup.chartData?.labels?.length || 0} periods
                        shown
                      </span>
                    </div>
                    {selectedGroup.paymentCycles &&
                      selectedGroup.paymentCycles.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Next due: Cycle {selectedGroup.currentCycle + 1} •
                          Total cycles: {selectedGroup.duration}
                        </div>
                      )}
                  </div>

                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-sm text-green-600 font-medium">
                        Collected
                      </div>
                      <div className="text-xl font-bold text-green-700">
                        ₹{selectedGroup.totalCollected.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="text-sm text-orange-600 font-medium">
                        Pending
                      </div>
                      <div className="text-xl font-bold text-orange-700">
                        ₹{selectedGroup.totalPending.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-sm text-primary-dark font-medium">
                        Members
                      </div>
                      <div className="text-xl font-bold text-blue-700">
                        {selectedGroup.memberCount}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  Select a group to view analysis
                </div>
              )}
            </div>
          </div>
        )}

        {/* General View */}
        {data && viewMode === "general" && (
          <GeneralReport data={data.general} />
        )}
      </div>
    </LoadingWrapper>
  );
}
