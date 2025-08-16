export default function DocsHomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">
          Team Dashboard Documentation
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Comprehensive documentation for the team management dashboard 
          system, including setup, architecture, and usage guides.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
            <p className="text-muted-foreground">
              Quick start guide for setting up the dashboard
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Architecture</h2>
            <p className="text-muted-foreground">
              System architecture and design decisions
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">API Reference</h2>
            <p className="text-muted-foreground">
              Complete API documentation and examples
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}