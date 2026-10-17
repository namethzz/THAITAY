import type { ReactNode } from "react";
export function PageHeading({ title, children }: { title: string; children: ReactNode }) {
  return <header className="scope-heading"><h1>{title}</h1><p>{children}</p></header>;
}
