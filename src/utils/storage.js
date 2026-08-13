/**
 * storage.js — Utility helpers
 *
 * This file now contains only utility functions for backup/export/import.
 * The primary storage layer is now:
 *   - Server: SQLite via better-sqlite3
 *   - Client: PersonalContext + KitchenContext (manage their own localStorage caching)
 *
 * Hardcoded demo data has been completely removed.
 * New users start with empty data — no Sharma Kirana fallback.
 */

/**
 * Export user's data as a downloadable JSON backup
 * Called from SettingsView — receives data from PersonalContext
 */
export const exportBackupData = ({ business, books, customers, transactions, cashbook, settings }) => {
  return {
    version: "3.0.0",
    exportTimestamp: new Date().toISOString(),
    business: business || {},
    books: books || [],
    customers: customers || [],
    transactions: transactions || [],
    cashbook: cashbook || [],
    settings: settings || {}
  };
};

/**
 * Validate and parse an imported backup file
 * Returns { valid: boolean, data: object, error: string }
 */
export const parseImportData = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);

    // Validation: must have at least one recognizable field
    const hasRecognizedFields = ["customers", "transactions", "cashbook", "business", "books"]
      .some(key => parsed[key] !== undefined);

    if (!hasRecognizedFields) {
      return { valid: false, error: "This file doesn't look like a Khata backup." };
    }

    return {
      valid: true,
      data: {
        business: parsed.business || null,
        books: Array.isArray(parsed.books) ? parsed.books : null,
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        cashbook: Array.isArray(parsed.cashbook) ? parsed.cashbook : [],
        settings: parsed.settings || null
      },
      error: null
    };
  } catch {
    return { valid: false, error: "Invalid file format. Please select a valid Khata backup (.json) file." };
  }
};

/**
 * Download a JSON object as a file
 */
export const downloadAsJson = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
