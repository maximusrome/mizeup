'use client';

import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactForm } from './_components/contact-form';

// Data
const features = [
  {
    icon: <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    title: "Easy Calendar Management",
    description: "Manage sessions on mobile and sync to your EHR instantly."
  },
  {
    icon: <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    title: "Optimized Progress Notes",
    description: "Automate notes, discover hidden reimbursement codes, and sync with one click."
  },
  {
    icon: <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    title: "Automated Reminders",
    description: "Send automatic text reminders to every client, stopping no-shows and saving time."
  }
];

const steps = [
  { step: "1", title: "Sign Up & Connect", description: "Sign up and connect your EHR account in under a minute." },
  { step: "2", title: "Manage Daily", description: "Manage your calendar and notes with our intuitive interface." },
  { step: "3", title: "Sync & See Results", description: "Sync your data and see revenue gains on your personalized dashboard." }
];


function HomeContent() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold logo-gradient">MizeUp</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" asChild>
                <a href="/login">Log In</a>
              </Button>
              <Button asChild>
                <a href="/login?tab=signup">Get Started</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 mt-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <Card className="glass-card glow-card p-6 md:p-12 rounded-3xl">
              <CardContent className="pt-6 px-0">
                <h1 className="mb-8">
                  <span className="logo-gradient block text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">Optimize Your Therapy Practice.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  Stop leaving money on the table with hidden billing codes.
                  Earn $500+ monthly while saving 3+ hours weekly on documentation.
                </p>
                <div className="flex justify-center">
                  <Button size="lg" asChild>
                    <a href="/login?tab=signup">Get Started</a>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Optimize Your Practice</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card glow-card text-center rounded-3xl p-4 md:p-6">
                <CardHeader className="px-0">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary/10">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <Card key={index} className="glass-card glow-card text-center rounded-3xl p-4 md:p-6">
                <CardHeader className="px-0">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary text-primary-foreground">
                    <span className="font-bold text-2xl">{step.step}</span>
                  </div>
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* About Section */}
      <section id="about" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">About Us</h2>
          </div>
          <Card className="glass-card glow-card p-6 md:p-12 rounded-3xl">
            <CardContent className="pt-6">
              <div className="max-w-3xl mx-auto space-y-6">
                <p className="text-lg leading-relaxed text-foreground">
                  Hey, I&apos;m Max. I&apos;m 20 years old and I love building startups that solve real problems and help real people. MizeUp was created because my aunt was overwhelmed by the documentation and administrative work required in her therapy practice, making it difficult for her to get paid for all of her work.
                </p>
                <p className="text-lg leading-relaxed text-foreground">
                  I created MizeUp to solve these problems by finding hidden reimbursement codes and by automating tedious tasks like copying calendar entries, documenting billing codes, and sending session reminders to clients.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h2>
          </div>
          
          <Card className="glass-card glow-card p-6 md:p-12 text-center rounded-3xl">
            <CardContent className="pt-6 px-0">
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

      {/* Call to Action Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="glass-card glow-card p-6 md:p-12 text-center rounded-3xl">
            <CardContent className="pt-6 px-0">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Ready to <span className="logo-gradient">MizeUp</span> your therapy practice?</h2>
              <div className="flex justify-center">
                <Button size="lg" asChild>
                  <a href="/login?tab=signup">Get Started</a>
                </Button>
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