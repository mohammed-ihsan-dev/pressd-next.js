import type { CSSProperties } from "react";
import SiteLayout, { generateMetadata as siteGenerateMetadata, viewport as siteViewport } from "./(site)/layout";

// The public site and /admin have separate root layouts (route groups), so
// there is no single layout to render a 404 for unmatched URLs. This keeps
// the public 404 exactly as it was before the split: the site's own document
// shell (fonts, styles, metadata) around Next's default 404 markup.
export const generateMetadata = siteGenerateMetadata;
export const viewport = siteViewport;

const styles: Record<string, CSSProperties> = {
  error: {
    fontFamily:
      'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
    height: "100vh",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  desc: { display: "inline-block" },
  h1: {
    display: "inline-block",
    margin: "0 20px 0 0",
    padding: "0 23px 0 0",
    fontSize: 24,
    fontWeight: 500,
    verticalAlign: "top",
    lineHeight: "49px",
  },
  h2: { fontSize: 14, fontWeight: 400, lineHeight: "49px", margin: 0 },
};

export default function GlobalNotFound() {
  return (
    <SiteLayout params={Promise.resolve({})}>
      <title>404: This page could not be found.</title>
      <div style={styles.error}>
        <div>
          <style
            dangerouslySetInnerHTML={{
              __html:
                "body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}",
            }}
          />
          <h1 className="next-error-h1" style={styles.h1}>
            404
          </h1>
          <div style={styles.desc}>
            <h2 style={styles.h2}>This page could not be found.</h2>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
