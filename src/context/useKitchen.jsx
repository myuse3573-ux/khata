import { useContext } from "react";
import { KitchenContext } from "./kitchenContextValue";

export const useKitchen = () => {
  const ctx = useContext(KitchenContext);
  if (!ctx) throw new Error("useKitchen must be used within KitchenProvider");
  return ctx;
};
