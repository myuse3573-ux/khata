/* eslint-disable react/only-export-components */
/**
 * KhataContext.jsx — Compatibility bridge
 *
 * Re-exports unified context combining PersonalContext + KitchenContext
 * so that existing components (DashboardView, CashbookView, etc.) that
 * import from "KhataContext" continue to work without modification.
 *
 * New components should import directly from PersonalContext or KitchenContext.
 */
export { PersonalProvider as KhataProvider, usePersonal as useKhata } from "./PersonalContext";
