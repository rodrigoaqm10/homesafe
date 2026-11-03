'use client';
import { createContext, type ReactNode, useContext, useState } from 'react';
import {
  type DemoState,
  initialState,
} from '@/modules/community/domain/demo-workflows';

type Store = {
  state: DemoState;
  update: (change: (previous: DemoState) => DemoState) => void;
  reset: () => void;
};
const Context = createContext<Store | null>(null);
export function useDemo() {
  const store = useContext(Context);
  if (!store) throw new Error('Demo provider missing');
  return store;
}
export default function DemoLayout({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  return (
    <Context.Provider
      value={{ state, update: setState, reset: () => setState(initialState()) }}
    >
      {children}
    </Context.Provider>
  );
}
