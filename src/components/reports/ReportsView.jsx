import React from "react";
import { useKhata } from "../../context/useKhata";
import { translations } from "../../utils/translations";
import { formatCurrency, calculateCustomerBalance } from "../../utils/formatters";
import { generateBusinessReportPDF, generateCustomerPDF } from "../../utils/pdfGenerator";
import { FileText, Download, FileSpreadsheet } from "lucide-react";

export const ReportsView = () => {
  const { customers, transactions, cashbook, business, settings } = useKhata();
  const t = translations[settings.lang] || translations.en;

  // Calculate totals
  let totalGet = 0;
  let totalGive = 0;

  const customersSummary = customers.map((cust) => {
    const custTxs = transactions.filter((t) => t.customerId === cust.id);
    const balanceInfo = calculateCustomerBalance(custTxs);

    if (balanceInfo.status === "get") totalGet += balanceInfo.balance;
    if (balanceInfo.status === "give") totalGive += balanceInfo.balance;

    return {
      ...cust,
      ...balanceInfo,
      txCount: custTxs.length,
      txs: custTxs
    };
  });

  // Export PDF Business Summary
  const handleExportFullPDF = () => {
    generateBusinessReportPDF({
      customers,
      transactions,
      cashbook,
      business
    });
  };

  // Export CSV Data
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Customer Name,Phone,Type,Total Udhar Gave (₹),Total Jama Got (₹),Net Balance (₹),Status\n";

    customersSummary.forEach((c) => {
      const gave = c.txs
        .filter((t) => t.type === "gave")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const got = c.txs
        .filter((t) => t.type === "got")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      csvContent += `"${c.name}","${c.phone || ""}","${c.type}",${gave},${got},${c.balance},"${c.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Khata_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base">{t.reportsTitle}</h2>
              <p className="text-xs text-slate-400">Export PDF statements & CSV balance sheets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleExportFullPDF}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-3xl shadow-md flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <Download className="w-6 h-6" />
          <span className="text-xs font-extrabold">{t.downloadPDF}</span>
        </button>

        <button
          onClick={handleExportCSV}
          className="bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-3xl shadow-md flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          <span className="text-xs font-extrabold">{t.exportExcel}</span>
        </button>
      </div>

      {/* Customer Statements List */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
          Customer Statements ({customersSummary.length})
        </h3>

        <div className="space-y-2">
          {customersSummary.map((cust) => (
            <div
              key={cust.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150 hover:bg-slate-100 transition-colors"
            >
              <div>
                <h4 className="font-bold text-slate-800 text-xs">{cust.name}</h4>
                <p className="text-[11px] text-slate-400">{cust.txCount} transactions</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`text-xs font-extrabold block ${
                    cust.status === "get" ? "text-rose-600" : cust.status === "give" ? "text-emerald-600" : "text-slate-500"
                  }`}>
                    {formatCurrency(cust.balance)}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {cust.status === "get" ? "You Get" : cust.status === "give" ? "You Give" : "Settled"}
                  </span>
                </div>

                <button
                  onClick={() => generateCustomerPDF({ customer: cust, transactions: cust.txs, business })}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                  title="Download Individual Customer PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
