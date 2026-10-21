import type { ReactNode } from "react";

export default function PageHead({ eyebrow, title, lede, actions }: { eyebrow: string; title: string; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions ? <div className="toolbar" style={{ margin: 0 }}>{actions}</div> : null}
    </header>
  );
}
