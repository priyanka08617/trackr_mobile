import { createContext, type MutableRefObject, type ReactNode } from "react";

export const AreaHeaderBackContext = createContext<MutableRefObject<
  (() => void) | null
> | null>(null);
export const AreaHeaderBackVisibleContext = createContext<
  (visible: boolean) => void
>(() => {});
export const AreaHeaderActionContext = createContext<
  (action: ReactNode) => void
>(() => {});
export const AreaHeaderTitleContext = createContext<
  (title: string | null) => void
>(() => {});
