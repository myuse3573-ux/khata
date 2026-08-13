import React from "react";
import { ConfirmDialog } from "./ConfirmDialog";

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
