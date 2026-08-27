import React, { useState } from "react";
import { useKhata } from "../../context/useKhata";
import { translations } from "../../utils/translations";
import { formatCurrency, formatDate, calculateCustomerBalance } from "../../utils/formatters";
import {
  Search,
  UserPlus,
  PlusCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  UtensilsCrossed
} from "lucide-react";

export const DashboardView = ({ onSelectCustomer, onOpenAddCustomer, onOpenAddTx, onOpenSplitBill }) => {
  const { customers, transactions, settings } = useKhata();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'get' | 'give' | 'settled'

  const t = translations[settings.lang] || translations.en;

  // Calculate global dashboard metrics
  let totalGet = 0;
  let totalGive = 0;

  const customersWithBalance = customers.map((cust) => {
    const custTxs = transactions
      .filter((tx) => tx.customerId === cust.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const balanceInfo = calculateCustomerBalance(custTxs);

    if (balanceInfo.status === "get") totalGet += balanceInfo.balance;
    if (balanceInfo.status === "give") totalGive += balanceInfo.balance;

    const lastTx = custTxs.length > 0 ? custTxs[0] : null;

    return {
      ...cust,
      ...balanceInfo,
      lastTxDate: lastTx ? lastTx.date : cust.createdDate,
      txCount: custTxs.length
    };
  });

  const netBalance = totalGet - totalGive;

  // Filter customers by search term and tab filter
  const filteredCustomers = customersWithBalance.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterType === "get") return c.status === "get";
    if (filterType === "give") return c.status === "give";
    if (filterType === "settled") return c.status === "settled";

    return true;
  });

  return (
    <div className="pb-36 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      
      {/* 1. Summary Metrics Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* You Will Get (Udhar - Red) */}
        <div
          onClick={() => setFilterType(filterType === "get" ? "all" : "get")}
          className={`cursor-pointer bg-white p-3.5 rounded-2xl shadow-sm border transition-all ${
            filterType === "get"
              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {t.youWillGet}
            </span>
            <div className="p-1 rounded-lg bg-rose-100/60">
              <TrendingUp className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-rose-600 tracking-tight">
            {formatCurrency(totalGet)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>{t.toCollect}</span>
            <span className="font-semibold">{customersWithBalance.filter(c => c.status === 'get').length} customers</span>
          </div>
        </div>

        {/* You Will Give (Jama - Green) */}
        <div
          onClick={() => setFilterType(filterType === "give" ? "all" : "give")}
          className={`cursor-pointer bg-white p-3.5 rounded-2xl shadow-sm border transition-all ${
            filterType === "give"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {t.youWillGive}
            </span>
            <div className="p-1 rounded-lg bg-emerald-100/60">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 tracking-tight">
            {formatCurrency(totalGive)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>{t.toPay}</span>
            <span className="font-semibold">{customersWithBalance.filter(c => c.status === 'give').length} customers</span>
          </div>
        </div>

      </div>

      {/* Net Balance Banner */}
      <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {t.netBalance}
            </span>
            <span className="text-base font-bold text-white">
              {formatCurrency(netBalance)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSplitBill}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all border border-emerald-500/40"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Split Kitchen 🍲</span>
          </button>

          <button
            onClick={onOpenAddTx}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all border border-slate-700"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>{t.addTransaction}</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs font-medium">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              filterType === "all"
                ? "bg-slate-900 text-white font-bold shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.filterAll} ({customers.length})
          </button>
          <button
            onClick={() => setFilterType("get")}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              filterType === "get"
                ? "bg-rose-600 text-white font-bold shadow-xs"
                : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
            }`}
          >
            {t.filterGet}
          </button>
          <button
            onClick={() => setFilterType("give")}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              filterType === "give"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            {t.filterGive}
          </button>
          <button
            onClick={() => setFilterType("settled")}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              filterType === "settled"
                ? "bg-slate-700 text-white font-bold shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.filterSettled}
          </button>
        </div>
      </div>

      {/* 3. Customer List */}
      <div className="space-y-2">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">{t.noCustomersFound}</p>
            <button
              onClick={onOpenAddCustomer}
              className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.addCustomer}</span>
            </button>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const isGet = customer.status === "get";
            const isGive = customer.status === "give";

            return (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="bg-white hover:bg-slate-50/80 active:bg-slate-100 rounded-2xl p-3.5 border border-slate-200/80 shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                {/* Left: Avatar & Customer Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {customer.avatar ? (
                    <img
                      src={customer.avatar}
                      alt={customer.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-base shrink-0">
                      {customer.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {customer.name}
                      </h4>
                      {customer.type === "supplier" && (
                        <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-1.5 py-0.5 rounded-md">
                          Supplier
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <span>{customer.phone}</span>
                      <span>•</span>
                      <span>{formatDate(customer.lastTxDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Balance & Status */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div
                      className={`text-base font-extrabold tracking-tight ${
                        isGet
                          ? "text-rose-600"
                          : isGive
                          ? "text-emerald-600"
                          : "text-slate-500"
                      }`}
                    >
                      {formatCurrency(customer.balance)}
                    </div>
                    <span
                      className={`text-[10px] font-bold block ${
                        isGet
                          ? "text-rose-500"
                          : isGive
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      {isGet
                        ? t.youWillGet
                        : isGive
                        ? t.youWillGive
                        : "Settled"}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Buttons (Mobile-first Android UX) */}
      <div className="fixed bottom-20 right-4 flex flex-col items-end gap-2.5 z-30">
        <button
          onClick={onOpenSplitBill}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 transition-transform active:scale-95 border border-emerald-400/40"
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Split Kitchen 🍲</span>
        </button>

        <button
          onClick={onOpenAddCustomer}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-slate-700 transition-transform active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>{t.addCustomer}</span>
        </button>
      </div>

    </div>
  );
};
