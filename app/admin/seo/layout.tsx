import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/seo/Nav";
import { currentViewer } from "@/lib/seo/auth/guard";

export default async function SeoLayout({ children }: LayoutProps<"/admin/seo">) {
  const viewer = await currentViewer();
  if (!viewer) redirect("/admin/login");
  return (
    <div className="seo-shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside className="seo-side">
        <Link href="/admin/seo" className="seo-brand">
          PRESS&apos;D<small>SEO Studio</small>
        </Link>
        <Nav />
        <div className="seo-user">
          <span>
            <b>{viewer.name ?? viewer.email}</b>
            <br />
            <span className="tag" title="Your permissions come from SEO_ADMIN_USERS">
              {viewer.role}
            </span>
          </span>
          <form action="/api/admin/auth/logout" method="post">
            <button className="btn btn-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main id="content" className="seo-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
