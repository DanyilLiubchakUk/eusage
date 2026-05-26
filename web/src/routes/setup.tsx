import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/setup")({
  component: Setup,
});

function Setup() {
  return (
    <main className="page narrow">
      <header className="sectionHeader">
        <p className="eyebrow">Owner setup</p>
        <h1>Create tokens for your team.</h1>
      </header>

      <form className="panel">
        <label>
          Setup token
          <input
            name="setupToken"
            placeholder="Paste SETUP_TOKEN from Vercel env"
            type="password"
          />
        </label>
        <label>
          Organization name
          <input name="organizationName" placeholder="Acme Team" />
        </label>
        <button className="button primary" type="button">
          Continue
        </button>
      </form>

      <section className="note">
        <h2>Token rule</h2>
        <p>
          Raw tokens are shown once. Later screens show only a fingerprint like
          <code> euw_12******9f </code> plus label and last-used time.
        </p>
      </section>
    </main>
  );
}
