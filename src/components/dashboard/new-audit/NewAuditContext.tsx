"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type NewAuditPreset = "rescan" | null;

type NewAuditState = {
  open: boolean;
  initialUrl: string;
  initialSiteId: string | null;
  initialClientId: string | null;
  preset: NewAuditPreset;
};

type NewAuditContextValue = NewAuditState & {
  openNewAudit: (opts?: {
    url?: string;
    siteId?: string;
    clientId?: string;
    preset?: NewAuditPreset;
  }) => void;
  closeNewAudit: () => void;
};

const NewAuditContext = createContext<NewAuditContextValue | null>(null);

export function NewAuditProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NewAuditState>({
    open: false,
    initialUrl: "",
    initialSiteId: null,
    initialClientId: null,
    preset: null,
  });

  const openNewAudit = useCallback(
    (opts?: { url?: string; siteId?: string; clientId?: string; preset?: NewAuditPreset }) => {
      setState({
        open: true,
        initialUrl: opts?.url ?? "",
        initialSiteId: opts?.siteId ?? null,
        initialClientId: opts?.clientId ?? null,
        preset: opts?.preset ?? null,
      });
    },
    []
  );

  const closeNewAudit = useCallback(() => {
    setState({
      open: false,
      initialUrl: "",
      initialSiteId: null,
      initialClientId: null,
      preset: null,
    });
  }, []);

  return (
    <NewAuditContext.Provider value={{ ...state, openNewAudit, closeNewAudit }}>
      {children}
    </NewAuditContext.Provider>
  );
}

export function useNewAudit() {
  const ctx = useContext(NewAuditContext);
  if (!ctx) throw new Error("useNewAudit must be used within NewAuditProvider");
  return ctx;
}
