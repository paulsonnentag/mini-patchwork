import { Context } from "./context";
import { createContext, useContext, useEffect, useRef, useState } from "react";

export const SharedContext = createContext<Context | null>(null);

export const useSharedContext = () => {
  const context = useContext(SharedContext);

  if (!context) {
    throw new Error("SharedContext not found");
  }

  return context;
};

export const useDerivedSharedContext = <V>(
  computation: (context: Context) => V
): V => {
  const context = useSharedContext();
  const computationRef = useRef(computation);
  const [state, setState] = useState<V>(computation(context));
  computationRef.current = computation;

  // Run once and subscribe to context changes
  useEffect(() => {
    // run immediately on mount or when context changes
    computationRef.current(context);

    // subscribe for subsequent changes
    const unsubscribe = context.onChange(() => {
      const newState = computationRef.current(context);
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [context]);

  return state;
};
