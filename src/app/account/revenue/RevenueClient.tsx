"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PaymentRecord = {
  id: string;
  dueId: string;
  userId: string;
  userName: string;
  userRole: string;
  chapterId: string;
  chapterName: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  paidAt: string;
};

const COLORS = ["#14b8a6", "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"];

export function RevenueClient() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments/history")
      .then((res) => res.json())
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch payments:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const uniqueChapters = new Set(payments.map((p) => p.chapterId)).size;
  const thisMonthPayments = payments.filter((p) => {
    const date = new Date(p.paidAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // Group payments by date for bar chart
  const paymentsByDate = payments.reduce(
    (acc, payment) => {
      const date = new Date(payment.paidAt).toLocaleDateString();
      const existing = acc.find((p) => p.date === date);
      if (existing) {
        existing.amount += payment.amount;
        existing.count += 1;
      } else {
        acc.push({ date, amount: payment.amount, count: 1 });
      }
      return acc;
    },
    [] as { date: string; amount: number; count: number }[]
  );

  // Group revenue by chapter for pie chart
  const revenueByChapter = payments.reduce(
    (acc, payment) => {
      const existing = acc.find((p) => p.name === payment.chapterName);
      if (existing) {
        existing.value += payment.amount;
      } else {
        acc.push({ name: payment.chapterName, value: payment.amount });
      }
      return acc;
    },
    [] as { name: string; value: number }[]
  );

  if (loading) {
    return <div className="text-center py-8">Loading revenue data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {[
    { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}` },
    { label: "Total Payments", value: String(payments.length) },
    { label: "Chapters", value: String(uniqueChapters) },
    { label: "This Month", value: `$${thisMonthRevenue.toFixed(2)}` },
  ].map(({ label, value }) => (
    <div key={label} className="site-panel rounded-[1.5rem] p-4 flex items-center gap-4">
      <div>
        <p className="text-xs font-semibold text-foreground/55 uppercase tracking-[0.14em]">{label}</p>
        <p className="text-2xl font-bold text-teal-deep mt-1">{value}</p>
      </div>
    </div>
  ))}
</div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="site-panel rounded-[2rem] p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Date</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={paymentsByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="site-panel rounded-[2rem] p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Chapter</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByChapter}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${value}`}
                outerRadius={80}
                fill="#14b8a6"
                dataKey="value"
              >
                {revenueByChapter.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="site-panel rounded-[2rem] p-6 md:p-7 overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold">Date</th>
              <th className="text-left py-3 px-4 font-semibold">User</th>
              <th className="text-left py-3 px-4 font-semibold">Role</th>
              <th className="text-left py-3 px-4 font-semibold">Chapter</th>
              <th className="text-left py-3 px-4 font-semibold">Reason</th>
              <th className="text-left py-3 px-4 font-semibold">Amount</th>
              <th className="text-left py-3 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  {new Date(payment.paidAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 font-semibold">{payment.userName}</td>
                <td className="py-3 px-4 text-gray-600 capitalize">{payment.userRole}</td>
                <td className="py-3 px-4 text-gray-600">{payment.chapterName}</td>
                <td className="py-3 px-4 text-gray-600">{payment.reason}</td>
                <td className="py-3 px-4 font-semibold">${payment.amount.toFixed(2)}</td>
                <td className="py-3 px-4">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded">
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="text-center py-8 text-gray-600">No payments yet.</p>
        )}
      </div>
    </div>
  );
}
