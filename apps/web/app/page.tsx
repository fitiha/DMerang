import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Instagram, ArrowRight, Zap, Users, Send, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />

      {/* Header */}
      <header className="relative border-b border-border backdrop-blur-xl bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              DM
            </div>
            <span className="text-xl font-bold text-primary">DMerang</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span>Automate your Instagram outreach</span>
            </div>

            <h1 className="text-5xl font-thin leading-tight md:text-6xl lg:text-7xl tracking-tight">
              Scale Your{" "}
              <span className="text-primary font-light">Instagram DMs</span>{" "}
              Effortlessly
            </h1>

            <p className="mt-6 text-lg text-muted-foreground md:text-xl font-light">
              Discover leads, create targeted campaigns, and send personalized
              messages at scale. All automated, all from one powerful dashboard.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 shadow-lg px-8 font-light"
                >
                  Start Automating
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="font-light">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* Dashboard preview placeholder */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="aspect-video rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="h-8 border-b border-border bg-muted flex items-center gap-2 px-4">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
              </div>
              <div className="p-8 flex items-center justify-center h-full">
                <p className="text-muted-foreground font-light">Dashboard Preview</p>
              </div>
            </div>
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/10 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative border-t border-border/50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extralight md:text-4xl">
              Everything you need to{" "}
              <span className="text-primary font-light">grow on Instagram</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features designed for modern Instagram marketing
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Users}
              title="Smart Lead Discovery"
              description="Scrape followers from target accounts with advanced bio filtering to find your ideal prospects."
            />
            <FeatureCard
              icon={Send}
              title="Campaign Automation"
              description="Create and schedule DM campaigns with personalized templates, working hours, and daily limits."
            />
            <FeatureCard
              icon={Shield}
              title="Safe & Controlled"
              description="Randomized delays, timezone awareness, and rate limiting to keep your account safe."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/50 py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Ready to supercharge your outreach?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of marketers automating their Instagram growth
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="mt-8 bg-primary hover:bg-primary/90 shadow-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 DMerang. Built for demonstration purposes.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
