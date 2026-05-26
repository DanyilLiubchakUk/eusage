import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tv/$orgId")({
  component: TvDashboard,
});

function TvDashboard() {
  const { orgId } = Route.useParams();

  return (
    <main className="tv">
      <header className="tvHeader">
        <div>
          <p className="eyebrow">TV dashboard</p>
          <h1>{orgId}</h1>
        </div>
        <div className="livePill">Waiting for data</div>
      </header>

      <section className="metricGrid">
        <article>
          <p>Team spend</p>
          <strong>$0.00</strong>
        </article>
        <article>
          <p>Active teammates</p>
          <strong>0</strong>
        </article>
        <article>
          <p>Providers</p>
          <strong>0</strong>
        </article>
      </section>

      <section className="emptyState">
        <h2>No snapshots yet</h2>
        <p>Install the desktop app, add a teammate write token, and usage will appear here.</p>
      </section>
    </main>
  );
}
