import { useContext } from "react";
import { PersonalContext } from "./personalContextValue";

export const usePersonal = () => {
  const ctx = useContext(PersonalContext);
  if (!ctx) throw new Error("usePersonal must be used within PersonalProvider");
  return ctx;
};
