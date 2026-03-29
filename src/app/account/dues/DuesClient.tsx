"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";

type Due = {
  id: string;
  description: string;
  amount: number;
  reason: string;
  chapter: string;
  dueDate: string;
};

type PaymentRecord = {
  id: string;
  dueId: string;
  amount: number;
  paidAt: string;
  userName: string;
  chapterName: string;
};

type DuesClientProps = {
  userName: string;
};

export function DuesClient({ userName }: DuesClientProps) {
  const [dues, setDues] = useState<Due[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedDues, setSelectedDues] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch dues
        const duesRes = await fetch("/api/payments/dues");
        const duesData = await duesRes.json();
        setDues(duesData);

        // Fetch payment history (source of truth from payments_cache.json)
        const historyRes = await fetch("/api/payments/history");
        const historyData = await historyRes.json();
        setPayments(Array.isArray(historyData) ? historyData : []);

        // Store in localStorage for client-side optimization
        if (Array.isArray(historyData)) {
          localStorage.setItem("wial_payments", JSON.stringify(historyData));
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setErrorMessage("Failed to load dues");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Check for payment success in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setSuccessMessage("Payment completed successfully!");
      window.history.replaceState({}, "", "/account/dues");
    }

    if (params.get("error")) {
      setErrorMessage(`Payment error: ${params.get("error")}`);
      window.history.replaceState({}, "", "/account/dues");
    }
  }, []);

  const isPaid = (dueId: string) => {
    return payments.some((p) => p.dueId === dueId);
  };

  const toggleDueSelection = (dueId: string) => {
    const newSelected = new Set(selectedDues);
    if (newSelected.has(dueId)) {
      newSelected.delete(dueId);
    } else {
      newSelected.add(dueId);
    }
    setSelectedDues(newSelected);
  };

  const handlePay = async (due: Due) => {
    setIsPaymentProcessing(true);
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueId: due.id,
          description: due.description,
          amount: due.amount,
          reason: due.reason,
          chapter: due.chapter,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage("Failed to create checkout session");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMessage("Failed to initiate payment");
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const generateReceipt = () => {
    const selectedPayments = payments.filter((p) => selectedDues.has(p.dueId));
    if (selectedPayments.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(24);
    doc.text("RECEIPT", pageWidth / 2, y, { align: "center" });
    y += 15;

    // Receipt details
    doc.setFontSize(10);
    doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 7;
    doc.text(`User: ${userName}`, margin, y);
    y += 10;

    // Items
    doc.setFontSize(12);
    doc.text("Items:", margin, y);
    y += 8;

    doc.setFontSize(10);
    let total = 0;
    selectedPayments.forEach((payment) => {
      const due = dues.find((d) => d.id === payment.dueId);
      if (due) {
        doc.text(`• ${due.description} - $${due.amount.toFixed(2)}`, margin + 5, y);
        y += 7;
        total += payment.amount;
      }
    });

    y += 5;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.text(`Total: $${total.toFixed(2)}`, pageWidth - margin - 40, y, { align: "right" });
    y += 15;

    // Approval stamp
    doc.setFontSize(14);
    doc.setTextColor(0, 128, 0);
    doc.text("✓ APPROVED", pageWidth / 2, pageHeight - 40, { align: "center" });

    // Save
    doc.save(`receipt-${Date.now()}.pdf`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading dues...</div>;
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="site-panel rounded-[2rem] p-6 md:p-7 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold">Select</th>
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-left py-3 px-4 font-semibold">Amount</th>
              <th className="text-left py-3 px-4 font-semibold">Reason</th>
              <th className="text-left py-3 px-4 font-semibold">Chapter</th>
              <th className="text-left py-3 px-4 font-semibold">Due Date</th>
              <th className="text-left py-3 px-4 font-semibold">Status</th>
              <th className="text-left py-3 px-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {dues.map((due) => {
              const paid = isPaid(due.id);
              return (
                <tr key={due.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {paid && (
                      <input
                        type="checkbox"
                        checked={selectedDues.has(due.id)}
                        onChange={() => toggleDueSelection(due.id)}
                        className="w-4 h-4"
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">{due.description}</td>
                  <td className="py-3 px-4 font-semibold">${due.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-600">{due.reason}</td>
                  <td className="py-3 px-4 text-gray-600">{due.chapter}</td>
                  <td className="py-3 px-4 text-gray-600">{due.dueDate}</td>
                  <td className="py-3 px-4">
                    {paid ? (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded">
                        Paid
                      </span>
                    ) : (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {!paid && (
                      <button
                        onClick={() => handlePay(due)}
                        disabled={isPaymentProcessing}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1 rounded disabled:opacity-50"
                      >
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDues.size > 0 && (
        <div className="flex justify-end gap-4">
          <button
            onClick={generateReceipt}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg"
          >
            Generate Receipt PDF
          </button>
        </div>
      )}
    </div>
  );
}
