import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">eUsage hosted dashboard</p>
        <h1>Team AI usage in one shared screen.</h1>
        <p className="lede">
          Deploy this web app to Vercel, connect Convex, create teammate write
          tokens, then open the TV dashboard from the same URL.
        </p>
        <div className="actions">
          <Link className="button primary" to="/setup">
            Setup
          </Link>
          <Link
            className="button"
            to="/tv/$orgId"
            params={{ orgId: "demo" }}
          >
            TV Preview
          </Link>
        </div>
      </section>

      <section className="steps" aria-label="Deployment flow">
        <div>
          <span>1</span>
          <h2>Owner signs in with setup token</h2>
          <p>Create the organization and teammate tokens after deploy.</p>
        </div>
        <div>
          <span>2</span>
          <h2>Teammates add write tokens</h2>
          <p>Desktop apps upload usage snapshots as their assigned teammate.</p>
        </div>
        <div>
          <span>3</span>
          <h2>TV uses read token</h2>
          <p>The dashboard reads combined usage without upload permission.</p>
        </div>
      </section>
    </main>
  );
}
