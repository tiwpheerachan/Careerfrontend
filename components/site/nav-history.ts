/**
 * Whether the page before this one in the tab's history is a page of this
 * site — so a "Back" button can step back without leaving the site.
 *
 * document.referrer only describes how the document was first loaded; the
 * pages opened after it are client-side navigations it never sees. The
 * navbar (mounted once per document) reports each path, so a second path
 * means the visitor has moved inside the site.
 */
let firstPath: string | null = null;
let movedInside = false;

export function notePath(path: string) {
  if (firstPath === null) firstPath = path;
  else if (path !== firstPath) movedInside = true;
}

export function previousPageIsOnSite(): boolean {
  if (window.history.length <= 1) return false;
  if (movedInside) return true;
  if (!document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}
