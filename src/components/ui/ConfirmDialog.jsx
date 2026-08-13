import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

/* eslint-disable react/only-export-components */
/**
 * ConfirmDialog — Global confirm modal for destructive actions.
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState(null);
 *   <ConfirmDialog
 *     isOpen={!!confirmState}
 *     title="Delete Customer?"
 *     description="This will permanently delete Ramesh Kumar and all their transactions."
 *     confirmLabel="Delete"
 *     variant="danger"
 *     onConfirm={() => { deleteCustomer(id); setConfirmState(null); }}
 *     onClose={() => setConfirmState(null)}
 *   />
 */
export const ConfirmDialog = ({
  isOpen,
  title = "Are you sure?",
  description = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'info'
  onConfirm,
  onClose
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white",
      icon: Trash2
    },
    warning: {
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white",
      icon: AlertTriangle
    },
    info: {
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
      icon: AlertTriangle
    }
  };

  const styles = variantStyles[variant] || variantStyles.danger;
  const Icon = styles.icon;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-pop-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl ${styles.iconBg} flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-7 h-7 ${styles.iconColor}`} />
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="font-extrabold text-lg text-slate-900 mb-1">{title}</h2>
          {description && (
            <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`py-3 rounded-2xl font-bold text-sm transition-colors ${styles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * useConfirm — hook for easy confirm dialog management
 *
 * const { confirm, ConfirmUI } = useConfirm();
 * confirm({ title, description, onConfirm });
 * return <>{ConfirmUI}</>;
 */
export const useConfirm = () => {
  const [state, setConfirmState] = React.useState(null);

  const confirm = (opts) => setConfirmState(opts);

  const ConfirmUI = state ? (
    <ConfirmDialog
      isOpen={true}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={state.onConfirm}
      onClose={() => setConfirmState(null)}
    />
  ) : null;

  return { confirm, ConfirmUI };
};
