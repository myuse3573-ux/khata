export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  const num = Math.abs(Number(amount));
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num);
  return `₹${formatted}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const dateFormatted = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return `${dateFormatted}, ${timeStr}`;
};

export const formatShortDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
};

/**
 * Calculates customer net balance from transactions
 * @param {Array} transactions 
 * @returns {Object} { balance, status: 'get' | 'give' | 'settled' }
 */
export const calculateCustomerBalance = (transactions = []) => {
  let net = 0;
  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === "gave") {
      net += amt; // We gave money/goods -> Customer owes us (+ balance)
    } else if (tx.type === "got") {
      net -= amt; // Customer paid us -> Balance decreases (- balance)
    }
  });

  let status = "settled";
  if (net > 0) status = "get"; // You will get (Red / Udhar)
  else if (net < 0) status = "give"; // You will give (Green / Jama)

  return {
    balance: Math.abs(net),
    rawBalance: net,
    status
  };
};
