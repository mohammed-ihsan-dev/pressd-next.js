import type { ReactNode } from "react";

/** Download link for a CSV export route — a file attachment, not a page, so a plain <a> rather than <Link>. */
export default function CsvLink({ kind, children }: { kind: "issues" | "pages" | "tasks"; children: ReactNode }) {
  return (
    <a className="btn" href={`/api/admin/seo/export/${kind}`} download>
      {children}
    </a>
  );
}
