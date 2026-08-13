/**
 * Utility Formatters & Financial Calculation Utilities
 * Financial Integrity: All monetary inputs are in integer paise (1 Rupee = 100 Paise)
 */

import { Transaction } from '../types';

/** Format integer paise to Rupee currency string (e.g. 10050 paise -> ₹100.50) */
export const formatCurrency = (paise: number): string => {
  if (paise === undefined || paise === null || isNaN(paise)) return '₹0';
  const rupees = Math.abs(paise) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(rupees);
  return `₹${formatted}`;
};

/** Convert Rupee decimal input to integer paise (e.g. 100.5 -> 10050) */
export const rupeesToPaise = (rupeesStr: string | number): number => {
  const num = typeof rupeesStr === 'string' ? parseFloat(rupeesStr) : rupeesStr;
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const dateFormatted = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return `${dateFormatted}, ${timeStr}`;
};

export const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short'
  });
};

/**
 * Calculates customer net balance from integer paise transactions
 * @returns { balancePaise, status: 'get' | 'give' | 'settled' }
 */
export const calculateCustomerBalance = (transactions: Transaction[] = []): {
  balancePaise: number;
  rawBalancePaise: number;
  status: 'get' | 'give' | 'settled';
} => {
  let netPaise = 0;
  transactions.forEach((tx) => {
    if (tx.deletedAt) return; // Ignore soft-deleted transactions
    const amt = tx.amount || 0;
    if (tx.type === 'gave') {
      netPaise += amt; // We gave money/goods -> Customer owes us (+ balance)
    } else if (tx.type === 'got') {
      netPaise -= amt; // Customer paid us -> Balance decreases (- balance)
    }
  });

  let status: 'get' | 'give' | 'settled' = 'settled';
  if (netPaise > 0) status = 'get'; // You will get (Red / Udhar)
  else if (netPaise < 0) status = 'give'; // You will give (Green / Jama)

  return {
    balancePaise: Math.abs(netPaise),
    rawBalancePaise: netPaise,
    status
  };
};
