'use client';

import { useEffect, useState } from 'react';

// Reusable Components
const Section = ({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`relative z-10 section-padding ${className}`}>
    <div className="elegant-container">
      {children}
    </div>
  </section>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="text-center mb-16">
    <h2 className="text-4xl font-bold text-charcoal mb-6">{title}</h2>
    {subtitle && <p className="text-xl text-charcoal">{subtitle}</p>}
  </div>
);

const Card = ({ icon, step, title, description }: { icon?: React.ReactNode; step?: string; title: string; description: string }) => (
  <div className="glass-card p-8 rounded-2xl text-center glow-card">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-capri">
      {icon || <span className="text-offwhite font-bold text-2xl">{step}</span>}
    </div>
    <h3 className={`${step ? 'text-2xl' : 'text-xl'} font-bold text-charcoal mb-4`}>{title}</h3>
    <p className="text-charcoal leading-relaxed">{description}</p>
  </div>
);

const Button = ({ children, variant = "primary", className = "", ...props }: { 
  children: React.ReactNode; 
  variant?: "primary" | "secondary"; 
  className?: string;
  [key: string]: any;
}) => {
  const baseClasses = "px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300";
  const variantClasses = {
    primary: "glass-button text-offwhite blue-gradient glow-button",
    secondary: "glass text-capri hover:bg-cream"
  };
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const CheckIcon = () => (
  <svg className="w-4 h-4 text-capri mr-2" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

// Data
const features = [
  {
    icon: <svg className="w-8 h-8 text-offwhite" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    title: "Easy Calendar Management",
    description: "Add, edit, move sessions on mobile—daily workflow simplified."
  },
  {
    icon: <svg className="w-8 h-8 text-offwhite" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    title: "Smart Progress Notes",
    description: "Voice dictation, conditional auto-responses, and niche code optimization for higher payouts."
  },
  {
    icon: <svg className="w-8 h-8 text-offwhite" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    title: "Seamless Sync",
    description: "Pull and push data to TherapyNotes with one click."
  }
];

const steps = [
  { step: "1", title: "Sign Up & Connect", description: "Sign up and connect your TherapyNotes account in under 5 minutes." },
  { step: "2", title: "Manage Daily", description: "Manage your calendar and notes with our intuitive interface." },
  { step: "3", title: "Sync & See Results", description: "Sync your data and see revenue gains on your personalized dashboard." }
];

const trustIndicators = [
  "Trusted by therapists",
  "HIPAA compliant", 
  "Built for solo therapists"
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className={`sticky-nav-bar w-full py-3 ${isScrolled ? 'scrolled' : ''}`}>
          <div className="elegant-container flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="logo cursor-pointer select-none">MizeUp</h1>
              <div className="hidden lg:flex items-center space-x-2">
                <a href="#features" className="nav-link">Product</a>
                <a href="#how-it-works" className="nav-link">How It Works</a>
                <a href="#pricing" className="nav-link">Pricing</a>
                <a href="#about" className="nav-link">About</a>
                <a href="#contact" className="nav-link">Contact</a>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="modern-btn btn-secondary">Log In</button>
              <button className="modern-btn btn-primary blue-gradient">Get Started</button>
              <button 
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-lg text-charcoal hover:bg-gray-100 transition-all duration-200 ml-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="elegant-container py-6">
              <div className="flex flex-col space-y-4">
                <a 
                  href="#features" 
                  onClick={closeMobileMenu}
                  className="text-charcoal hover:text-capri transition-colors py-2 pt-6"
                >
                  Product
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={closeMobileMenu}
                  className="text-charcoal hover:text-capri transition-colors py-2"
                >
                  How It Works
                </a>
                <a 
                  href="#pricing" 
                  onClick={closeMobileMenu}
                  className="text-charcoal hover:text-capri transition-colors py-2"
                >
                  Pricing
                </a>
                <a 
                  href="#about" 
                  onClick={closeMobileMenu}
                  className="text-charcoal hover:text-capri transition-colors py-2"
                >
                  About
                </a>
                <a 
                  href="#contact" 
                  onClick={closeMobileMenu}
                  className="text-charcoal hover:text-capri transition-colors py-2 pb-6"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 section-padding-lg">
        <div className="hero-container text-center">
          <div className="bg-white p-12 rounded-3xl mb-16 shadow-lg">
            <h1 className="text-5xl md:text-6xl font-bold mb-8">
              <div className="text-5xl md:text-6xl font-bold" style={{
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Maximize. Optimize.</div>
              <div className="text-charcoal text-4xl md:text-5xl font-semibold mt-4">Your Therapy Practice.</div>
            </h1>
            <p className="text-xl text-charcoal mb-10 max-w-3xl mx-auto leading-relaxed">
              Stop leaving money on the table with hidden billing codes.
              Earn $500+ additional monthly revenue while saving 3+ hours weekly in tedious documentation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button>Get Started</Button>
              <Button variant="secondary">Watch Demo</Button>
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8 text-sm text-charcoal">
              {trustIndicators.map((indicator, index) => (
                <div key={index} className="flex items-center">
                  <CheckIcon />{indicator}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <Section id="features">
        <SectionHeader 
          title="Everything You Need to Streamline Your Practice" 
          subtitle="Powerful features designed specifically for solo practice therapists"
        />
        <div className="elegant-grid">
          {features.map((feature, index) => (
            <Card key={index} icon={feature.icon} title={feature.title} description={feature.description} />
          ))}
        </div>
      </Section>

      {/* How It Works Section */}
      <Section id="how-it-works">
        <SectionHeader 
          title="How It Works" 
          subtitle="Get started in minutes and see results immediately"
        />
        <div className="elegant-grid">
          {steps.map((step, index) => (
            <Card key={index} step={step.step} title={step.title} description={step.description} />
          ))}
        </div>
      </Section>

      {/* Pricing Section */}
      <Section id="pricing">
        <SectionHeader 
          title="Ready to Reclaim Your Time?" 
          subtitle="Monthly subscription—free trial coming soon."
        />
        <div className="glass-card p-12 rounded-3xl glow-card text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button>Sign Up Now</Button>
            <Button variant="secondary">Get Updates</Button>
          </div>
          <p className="text-sm text-charcoal">Join our email list for early access and updates</p>
        </div>
      </Section>

      {/* About Section */}
      <Section id="about">
        <SectionHeader 
          title="About Us" 
          subtitle="Built by therapists, for therapists"
        />
        <div className="glass-card p-12 rounded-3xl glow-card text-center">
          <p className="text-xl text-charcoal mb-8 leading-relaxed">
            MizeUp was founded with a simple mission: to help solo practice therapists 
            maximize their insurance reimbursements while reducing administrative burden. 
            We understand the challenges you face daily—from managing complex billing codes 
            to keeping up with ever-changing insurance requirements.
          </p>
          <p className="text-lg text-charcoal leading-relaxed">
            Our platform is designed specifically for therapists, providing smart suggestions 
            and automated workflows that save you time and increase your revenue.
          </p>
        </div>
      </Section>

      {/* Contact Section */}
      <Section id="contact">
        <SectionHeader 
          title="Contact Us" 
          subtitle="Get in touch with our team"
        />
        <div className="glass-card p-12 rounded-3xl glow-card">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-charcoal mb-6">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-capri mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-charcoal">hello@mizeup.com</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-capri mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-charcoal">(555) 123-4567</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-charcoal mb-6">Send us a Message</h3>
              <form className="space-y-4">
                <input type="text" placeholder="Your Name" className="w-full px-4 py-3 rounded-lg glass border border-cream focus:border-capri focus:outline-none transition-colors" />
                <input type="email" placeholder="Your Email" className="w-full px-4 py-3 rounded-lg glass border border-cream focus:border-capri focus:outline-none transition-colors" />
                <textarea placeholder="Your Message" rows={4} className="w-full px-4 py-3 rounded-lg glass border border-cream focus:border-capri focus:outline-none transition-colors resize-none"></textarea>
                <Button className="w-full">Send Message</Button>
              </form>
            </div>
          </div>
        </div>
      </Section>

      <footer className="py-8">
        <div className="elegant-container">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-2 logo">MizeUp</h3>
              <p className="text-gray-600 text-sm">Maximize. Optimize. Your Therapy Practice.</p>
            </div>
            <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-8">
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
                <a href="#about" className="text-gray-600 hover:text-capri transition-colors text-sm">About</a>
                <a href="#contact" className="text-gray-600 hover:text-capri transition-colors text-sm">Contact</a>
                <a href="#" className="text-gray-600 hover:text-capri transition-colors text-sm">Privacy</a>
                <a href="#" className="text-gray-600 hover:text-capri transition-colors text-sm">Terms</a>
              </div>
              <div className="text-gray-500 text-sm text-center lg:text-left">
                &copy; 2025 MizeUp. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}