import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatCurrency, formatDate, calculateCustomerBalance } from "./formatters";

export const generateCustomerPDF = ({ customer, transactions, business }) => {
  const doc = new jsPDF();
  const { balance, status } = calculateCustomerBalance(transactions);

  // Colors
  const primaryColor = [22, 163, 74]; // Emerald green
  const dangerColor = [220, 38, 38]; // Red
  const darkColor = [30, 41, 59]; // Slate 800

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(business.name || "Digital Khata Book", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(business.address || "", 14, 25);
  doc.text(`Phone: ${business.phone || ""} | GSTIN: ${business.gstin || "N/A"}`, 14, 30);

  // Report Title
  doc.setTextColor(...darkColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER ACCOUNT STATEMENT", 14, 46);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 52);

  // Customer Info Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 56, 182, 28, 2, 2, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Customer Name: ${customer.name}`, 18, 64);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Phone: ${customer.phone || "N/A"}`, 18, 70);
  doc.text(`Address: ${customer.address || "N/A"}`, 18, 76);

  // Balance Badge Box inside customer info
  let statusText = "SETTLED (₹0)";
  let badgeBg = [100, 116, 139];
  if (status === "get") {
    statusText = `YOU WILL GET: ${formatCurrency(balance)}`;
    badgeBg = dangerColor;
  } else if (status === "give") {
    statusText = `YOU WILL GIVE: ${formatCurrency(balance)}`;
    badgeBg = primaryColor;
  }

  doc.setFillColor(...badgeBg);
  doc.roundedRect(120, 61, 70, 18, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, 125, 72);

  // Prepare Transactions Table Data
  const tableRows = transactions.map((tx, index) => {
    const isGave = tx.type === "gave";
    return [
      index + 1,
      formatDate(tx.date),
      tx.note || (isGave ? "Udhar Entry" : "Jama Entry"),
      tx.mode || "Cash",
      isGave ? formatCurrency(tx.amount) : "-",
      !isGave ? formatCurrency(tx.amount) : "-"
    ];
  });

  // Calculate Totals
  const totalGave = transactions
    .filter((t) => t.type === "gave")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalGot = transactions
    .filter((t) => t.type === "got")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // AutoTable
  doc.autoTable({
    startY: 90,
    head: [["#", "Date & Time", "Details / Note", "Mode", "You Gave (₹)", "You Got (₹)"]],
    body: tableRows,
    foot: [["", "", "TOTALS", "", formatCurrency(totalGave), formatCurrency(totalGot)]],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 35 },
      2: { cellWidth: 65 },
      3: { cellWidth: 20 },
      4: { cellWidth: 26, textColor: dangerColor, fontStyle: "bold" },
      5: { cellWidth: 26, textColor: primaryColor, fontStyle: "bold" }
    },
    styles: { fontSize: 8, cellPadding: 3 }
  });

  // Footer Note & Stamp
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Thank you for your business!", 14, finalY);
  doc.text(`Authorized Signature: ${business.owner || business.name}`, 140, finalY);
  doc.line(140, finalY + 2, 190, finalY + 2);

  doc.save(`${customer.name.replace(/\s+/g, "_")}_Ledger_Statement.pdf`);
};

export const generateBusinessReportPDF = ({ customers, transactions, cashbook, business }) => {
  const doc = new jsPDF();
  const primaryColor = [22, 163, 74];
  const darkColor = [30, 41, 59];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(business.name || "Digital Khata Book", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("FULL BUSINESS SUMMARY & LEDGER REPORT", 14, 26);

  // Business Totals
  let totalGet = 0;
  let totalGive = 0;

  customers.forEach((cust) => {
    const custTxs = transactions.filter((t) => t.customerId === cust.id);
    const { balance, status } = calculateCustomerBalance(custTxs);
    if (status === "get") totalGet += balance;
    if (status === "give") totalGive += balance;
  });

  // Cashbook Totals
  const cashIn = (cashbook || [])
    .filter(c => c.type === "in")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const cashOut = (cashbook || [])
    .filter(c => c.type === "out")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  doc.setFontSize(12);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY METRICS", 14, 46);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Customers/Suppliers: ${customers.length}`, 14, 53);
  doc.text(`Total To Collect (You Will Get): ${formatCurrency(totalGet)}`, 14, 59);
  doc.text(`Total To Pay (You Will Give): ${formatCurrency(totalGive)}`, 14, 65);
  doc.text(`Net Outstanding Balance: ${formatCurrency(totalGet - totalGive)}`, 14, 71);
  doc.text(`Cashbook Balance (In: ${formatCurrency(cashIn)} | Out: ${formatCurrency(cashOut)}): ${formatCurrency(cashIn - cashOut)}`, 14, 77);

  const customerRows = customers.map((cust, idx) => {
    const custTxs = transactions.filter((t) => t.customerId === cust.id);
    const { balance, status } = calculateCustomerBalance(custTxs);
    let statusFormatted = "Settled (₹0)";
    if (status === "get") statusFormatted = `Get ${formatCurrency(balance)}`;
    if (status === "give") statusFormatted = `Give ${formatCurrency(balance)}`;

    return [
      idx + 1,
      cust.name,
      cust.phone || "N/A",
      cust.type.toUpperCase(),
      custTxs.length,
      statusFormatted
    ];
  });

  doc.autoTable({
    startY: 82,
    head: [["#", "Customer Name", "Phone", "Type", "Entries", "Net Balance"]],
    body: customerRows,
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    styles: { fontSize: 8 }
  });

  doc.save(`Business_Khata_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
};
