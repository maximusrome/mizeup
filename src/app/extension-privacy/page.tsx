export default function ExtensionPrivacy() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Mizeup Extension Privacy Policy</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Collection</h2>
            <p>We collect the following data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address (collected once, stored locally in your browser)</li>
              <li>Usage analytics data from TherapyNotes.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Usage</h2>
            <p>Your data is used to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Identify analytics data in our system</li>
              <li>Improve the Mizeup platform</li>
              <li>Provide support and troubleshooting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Storage</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address is stored locally in your browser</li>
              <li>Analytics data is sent to PostHog (our analytics platform)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Third Parties</h2>
            <p>We use PostHog for analytics. PostHog receives usage data to help us understand how the extension is used.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Sharing</h2>
            <p>We do not sell or share your data with third parties outside of PostHog analytics.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
            <p>Questions about this policy? Contact us at <a href="mailto:max@mizeup.com" className="text-primary hover:underline">max@mizeup.com</a></p>
          </section>

          <section className="mt-8 pt-6 border-t">
            <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
          </section>
        </div>
      </div>
    </div>
  );
}
