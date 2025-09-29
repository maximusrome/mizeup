'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactForm } from '@/components/ContactForm';

// Data
const features = [
  {
    icon: <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    title: "Easy Calendar Management",
    description: "Add, edit, move sessions on mobile—daily workflow simplified."
  },
  {
    icon: <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    title: "Smart Progress Notes",
    description: "Voice dictation, conditional auto-responses, and niche code optimization for higher payouts."
  },
  {
    icon: <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    title: "Seamless Sync",
    description: "Copy and paste data to your favorite EHR with one click."
  }
];

const steps = [
  { step: "1", title: "Sign Up & Connect", description: "Sign up and connect your EHR account in under 5 minutes." },
  { step: "2", title: "Manage Daily", description: "Manage your calendar and notes with our intuitive interface." },
  { step: "3", title: "Sync & See Results", description: "Sync your data and see revenue gains on your personalized dashboard." }
];


function HomeContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle password reset redirect
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      // Redirect to update password page with the code
      router.replace(`/auth/update-password?code=${code}`);
    }
  }, [searchParams, router]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold logo-gradient">MizeUp</h1>
              <div className="hidden lg:flex items-center space-x-6">
                <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Product</a>
                <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">How It Works</a>
                <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</a>
                <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">About</a>
                <a href="#contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</a>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" asChild>
                <a href="/auth/login">Log In</a>
              </Button>
              <Button asChild>
                <a href="/auth/login?tab=signup">Get Started</a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="lg:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-background border-t">
            <div className="px-8 py-6">
              <div className="flex flex-col space-y-4">
                <a href="#features" onClick={closeMobileMenu} className="text-sm font-medium hover:text-primary transition-colors py-2">
                  Product
                </a>
                <a href="#how-it-works" onClick={closeMobileMenu} className="text-sm font-medium hover:text-primary transition-colors py-2">
                  How It Works
                </a>
                <a href="#pricing" onClick={closeMobileMenu} className="text-sm font-medium hover:text-primary transition-colors py-2">
                  Pricing
                </a>
                <a href="#about" onClick={closeMobileMenu} className="text-sm font-medium hover:text-primary transition-colors py-2">
                  About
                </a>
                <a href="#contact" onClick={closeMobileMenu} className="text-sm font-medium hover:text-primary transition-colors py-2">
                  Contact
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <Card className="glass-card glow-card p-8 md:p-12 rounded-3xl">
              <CardContent className="pt-6">
                <h1 className="mb-2 leading-tight">
                  <span className="logo-gradient block text-4xl md:text-5xl lg:text-6xl font-bold">Optimize Your Therapy Practice.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed mt-6">
                  Stop leaving money on the table with hidden billing codes.
                  Earn $500+ additional monthly revenue while saving 3+ hours weekly in tedious documentation.
                </p>
                <div className="flex justify-center mb-8">
                  <Button size="lg" asChild>
                    <a href="/auth/login?tab=signup">Get Started</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Streamline Your Practice</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">Powerful features designed specifically for solo practice therapists</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card glow-card text-center rounded-3xl">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary/10">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">Get started in minutes and see results immediately</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <Card key={index} className="glass-card glow-card text-center rounded-3xl">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary text-primary-foreground">
                    <span className="font-bold text-2xl">{step.step}</span>
                  </div>
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Reclaim Your Time?</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">Monthly subscription—free trial coming soon.</p>
          </div>
          <Card className="glass-card glow-card p-12 text-center rounded-3xl">
            <CardContent className="pt-6">
              <div className="flex justify-center mb-8">
                <Button size="lg" asChild>
                  <a href="/auth/login?tab=signup">Sign Up Now</a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Ready to maximize your practice revenue?</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">About Us</h2>
            <p className="text-xl text-muted-foreground">Built by therapists, for therapists</p>
          </div>
          <Card className="glass-card glow-card p-12 text-center rounded-3xl">
            <CardContent className="pt-6">
              <p className="text-xl mb-8 leading-relaxed">
                MizeUp was founded with a simple mission: to help solo practice therapists
                maximize their insurance reimbursements while reducing administrative burden.
                We understand the challenges you face daily—from managing complex billing codes
                to keeping up with ever-changing insurance requirements.
              </p>
              <p className="text-lg leading-relaxed">
                Our platform is designed specifically for therapists, providing smart suggestions
                and automated workflows that save you time and increase your revenue.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h2>
            <p className="text-lg text-muted-foreground">Get in touch with any questions</p>
          </div>
          
          <Card className="glass-card glow-card p-8 md:p-12 text-center rounded-3xl">
            <CardContent className="pt-6">
              <ContactForm />
              
              <div className="mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:max@mizeup.com" className="text-muted-foreground hover:text-primary transition-colors">
                    max@mizeup.com
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-2 logo-gradient">MizeUp</h3>
              <p className="text-muted-foreground text-sm">Optimize Your Therapy Practice.</p>
            </div>
            <div className="text-muted-foreground text-sm text-center lg:text-left">
              &copy; 2025 MizeUp. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}