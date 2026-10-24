import { renderToString } from "react-dom/server";
import { Routes, Route, StaticRouter } from "react-router-dom";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import Index from "../../src/pages/Index";
import Blog from "../../src/pages/Blog";
import BlogPost from "../../src/pages/BlogPost";
import CarePlus from "../../src/pages/care/CarePlus";
import TrustSafety from "../../src/pages/legal/TrustSafety";
import Terms from "../../src/pages/legal/Terms";
import Privacy from "../../src/pages/legal/Privacy";
import Popia from "../../src/pages/legal/Popia";
import RefundsCancellations from "../../src/pages/legal/RefundsCancellations";
import AccountDeletion from "../../src/pages/legal/AccountDeletion";
import Cookies from "../../src/pages/legal/Cookies";
import AcceptableUse from "../../src/pages/legal/AcceptableUse";
import AiConciergeNotice from "../../src/pages/legal/AiConciergeNotice";
import CarePlusTerms from "../../src/pages/legal/CarePlusTerms";
import XooterTerms from "../../src/pages/legal/XooterTerms";
import { blogPosts } from "../../src/lib/blog-posts";

// Public, anonymous components only. No AuthProvider, session restoration or API prefetch.
const pages = [
  ["/", Index, "src/pages/Index.tsx"],
  ["/articles", Blog, "src/pages/Blog.tsx"],
  ["/care-plus", CarePlus, "src/pages/care/CarePlus.tsx"],
  ["/trust-centre", TrustSafety, "src/pages/legal/TrustSafety.tsx"],
  ["/legal/terms", Terms, "src/pages/legal/Terms.tsx"],
  ["/legal/privacy", Privacy, "src/pages/legal/Privacy.tsx"],
  ["/legal/popia", Popia, "src/pages/legal/Popia.tsx"],
  ["/legal/refunds-cancellations", RefundsCancellations, "src/pages/legal/RefundsCancellations.tsx"],
  ["/legal/account-deletion", AccountDeletion, "src/pages/legal/AccountDeletion.tsx"],
  ["/legal/cookies", Cookies, "src/pages/legal/Cookies.tsx"],
  ["/legal/acceptable-use", AcceptableUse, "src/pages/legal/AcceptableUse.tsx"],
  ["/legal/ai-concierge", AiConciergeNotice, "src/pages/legal/AiConciergeNotice.tsx"],
  ["/legal/care-plus-terms", CarePlusTerms, "src/pages/legal/CarePlusTerms.tsx"],
  ["/legal/xooter-terms", XooterTerms, "src/pages/legal/XooterTerms.tsx"],
] as const;

export const publicRoutes = [
  ...pages.map(([path, , module]) => ({ path, module })),
  ...blogPosts.map(post => ({ path: `/articles/${post.slug}`, module: "src/pages/BlogPost.tsx" })),
];

export function renderPublicPage(path: string) {
  if (!publicRoutes.some(route => route.path === path)) throw new Error(`Not a public render route: ${path}`);
  const helmetContext: { helmet?: HelmetServerState } = {};
  const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false, gcTime: 0 } } });
  try {
    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider context={helmetContext}>
          <TooltipProvider>
            <StaticRouter location={path}>
              <Routes>
                {pages.map(([url, Page]) => <Route key={url} path={url} element={<Page />} />)}
                <Route path="/articles/:slug" element={<BlogPost />} />
              </Routes>
            </StaticRouter>
          </TooltipProvider>
        </HelmetProvider>
      </QueryClientProvider>,
    );
    const helmet = helmetContext.helmet;
    if (!helmet || !html.includes("<h1")) throw new Error(`Public render produced no page heading: ${path}`);
    return { html, head: helmet.title.toString() + helmet.meta.toString() + helmet.link.toString() + helmet.script.toString() };
  } finally { queryClient.clear(); }
}
