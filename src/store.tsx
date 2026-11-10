import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setSoundEnabled } from "./lib/sound";
import { refresh, type AppState } from "./lib/state";
import { loadState, requestPersist, saveState } from "./lib/storage";

interface Store {
  state: AppState;
  /** 在副本上修改并保存 */
  update: (mutate: (draft: AppState) => void) => void;
  replace: (next: AppState) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const pending = useRef<AppState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (pending.current) {
      void saveState(pending.current);
      pending.current = null;
    }
  }, []);

  const persist = useCallback(
    (next: AppState) => {
      pending.current = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 300);
    },
    [flush],
  );

  useEffect(() => {
    void loadState().then((s) => {
      refresh(s);
      setState(s);
      void saveState(s);
    });
    void requestPersist();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else
        setState((s) => {
          if (!s) return s;
          const draft = structuredClone(s);
          if (!refresh(draft)) return s;
          persist(draft);
          return draft;
        });
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [flush, persist]);

  useEffect(() => {
    if (state) setSoundEnabled(state.settings.sound);
  }, [state]);

  const update = useCallback(
    (mutate: (draft: AppState) => void) => {
      setState((s) => {
        if (!s) return s;
        const draft = structuredClone(s);
        mutate(draft);
        persist(draft);
        return draft;
      });
    },
    [persist],
  );

  const replace = useCallback(
    (next: AppState) => {
      setState(next);
      persist(next);
    },
    [persist],
  );

  if (!state) return <div className="splash">Skill Up EDU</div>;
  return <StoreContext.Provider value={{ state, update, replace }}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
