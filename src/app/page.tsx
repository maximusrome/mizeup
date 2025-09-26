'use client';

import { useEffect, useState } from 'react';

// ==========================================================================
// COMPONENT DEFINITIONS
// ==========================================================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface StepCardProps {
  step: string;
  title: string;
  description: string;
}

// ==========================================================================
// REUSABLE COMPONENTS
// ==========================================================================

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="glass-card p-8 rounded-2xl text-center glow-card">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-capri">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-charcoal mb-4">{title}</h3>
    <p className="text-charcoal leading-relaxed">{description}</p>
  </div>
);

const StepCard = ({ step, title, description }: StepCardProps) => (
  <div className="glass-card p-8 rounded-2xl text-center glow-card">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-capri">
      <span className="text-offwhite font-bold text-2xl">{step}</span>
    </div>
    <h3 className="text-2xl font-bold text-charcoal mb-4">{title}</h3>
    <p className="text-charcoal leading-relaxed">{description}</p>
  </div>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-capri mr-2" fill="currentColor" viewBox="0 0 20 20">
    <path 
      fillRule="evenodd" 
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
      clipRule="evenodd" 
    />
  </svg>
);

// ==========================================================================
// MAIN COMPONENT
// ==========================================================================

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ==========================================================================
  // DATA
  // ==========================================================================

  const features = [
    {
      icon: (
        <svg className="w-8 h-8 text-offwhite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Easy Calendar Management",
      description: "Add, edit, move sessions on mobile—daily workflow simplified."
    },
    {
      icon: (
        <svg className="w-8 h-8 text-offwhite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Smart Progress Notes",
      description: "Voice dictation, conditional auto-responses, and niche code optimization for higher payouts."
    },
    {
      icon: (
        <svg className="w-8 h-8 text-offwhite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      title: "Seamless Sync",
      description: "Push data to TherapyNotes with one click—pull history for revenue dashboards."
    }
  ];

  const steps = [
    {
      step: "1",
      title: "Sign Up & Connect",
      description: "Sign up and connect your TherapyNotes account in under 5 minutes."
    },
    {
      step: "2",
      title: "Manage Daily",
      description: "Manage your calendar and notes daily or bi-weekly with our intuitive interface."
    },
    {
      step: "3",
      title: "Sync & See Results",
      description: "Sync your data and see revenue gains on your personalized dashboard."
    }
  ];

  const benefits = [
    "Free trial coming soon",
    "HIPAA-ready security",
    "Designed for solo therapists"
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className={`sticky-nav-bar w-full py-4 ${isScrolled ? 'scrolled' : ''}`}>
          <div className="elegant-container flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="logo cursor-pointer select-none text-capri">MizeUp</h1>
              
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
              <button className="modern-btn btn-primary">Get Started</button>
              
              <button className="lg:hidden p-2 rounded-lg text-charcoal transition-all duration-200 ml-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 section-padding-lg">
        <div className="hero-container text-center">
          <div className="glass-card p-12 rounded-3xl mb-16 glow-card">
            <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-8">
              Maximize Your Therapy
              <span className="text-gradient block">Reimbursements and Reclaim Your Time</span>
            </h1>
            <p className="text-xl text-charcoal mb-10 max-w-4xl mx-auto">
              Streamline calendars, notes, and billing sync with TherapyNotes—save 3-4 hours/month 
              and boost revenue with smart code suggestions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button className="glass-button px-8 py-4 rounded-full text-offwhite font-semibold text-lg blue-gradient glow-button">
                Get Started Free
              </button>
              <button className="glass px-8 py-4 rounded-full text-capri font-semibold text-lg">
                Learn More
              </button>
            </div>
            <div className="flex justify-center items-center space-x-8 text-sm text-charcoal">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center">
                  <CheckIcon />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 section-padding">
        <div className="wide-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-charcoal mb-6">
              Everything You Need to
              <span className="text-gradient block">Streamline Your Practice</span>
            </h2>
            <p className="text-xl text-charcoal max-w-2xl mx-auto">
              Built specifically for solo practice therapists targeting insurers like Blue Cross Blue Shield.
            </p>
          </div>

          <div className="elegant-grid">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 section-padding">
        <div className="wide-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-charcoal mb-6">How It Works</h2>
            <p className="text-xl text-charcoal">
              Get started in minutes and see results immediately
            </p>
          </div>

          <div className="elegant-grid">
            {steps.map((step, index) => (
              <StepCard
                key={index}
                step={step.step}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 section-padding">
        <div className="wide-container text-center">
          <p className="text-charcoal text-sm mb-8">
            Designed for solo therapists targeting insurers like Blue Cross Blue Shield
          </p>
          <div className="glass-card p-8 rounded-2xl glow-card">
            <p className="text-charcoal text-lg">
              <span className="text-capri font-semibold">Beta users saved 3-4 hours/month</span> on administrative tasks
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="relative z-10 section-padding">
        <div className="elegant-container text-center">
          <div className="glass-card p-12 rounded-3xl glow-card">
            <h2 className="text-4xl font-bold text-charcoal mb-6">
              Ready to Reclaim Your Time?
            </h2>
            <p className="text-xl text-charcoal mb-8">
              Monthly subscription—free trial coming soon.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="glass-button px-8 py-4 rounded-full text-offwhite font-semibold text-lg blue-gradient glow-button">
                Sign Up Now
              </button>
              <button className="glass px-8 py-4 rounded-full text-capri font-semibold text-lg">
                Get Updates
              </button>
            </div>
            <p className="text-sm text-charcoal mt-4">
              Join our email list for early access and updates
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 section-padding">
        <div className="elegant-container text-center">
          <div className="glass-card p-12 rounded-3xl glow-card">
            <h2 className="text-4xl font-bold text-charcoal mb-6">
              About MizeUp
            </h2>
            <p className="text-xl text-charcoal mb-8 leading-relaxed">
              MizeUp was founded with a simple mission: to help solo practice therapists 
              maximize their insurance reimbursements while reducing administrative burden. 
              We understand the challenges you face daily—from managing complex billing codes 
              to keeping up with ever-changing insurance requirements.
            </p>
            <p className="text-lg text-charcoal leading-relaxed">
              Our platform is designed specifically for therapists who work with major insurers 
              like Blue Cross Blue Shield, providing smart suggestions and automated workflows 
              that save you time and increase your revenue.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 section-padding">
        <div className="elegant-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-charcoal mb-6">Contact Us</h2>
            <p className="text-xl text-charcoal">
              Ready to streamline your practice? Get in touch with our team.
            </p>
          </div>
          
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
                  <div>
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      className="w-full px-4 py-3 rounded-lg glass border border-cream focus:border-capri focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <input 
                      type="email" 
                      placeholder="Your Email" 
                      className="w-full px-4 py-3 rounded-lg glass border border-cream focus:border-capri focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <textarea 
                      placeholder="Your Message" 
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg glass border border-cream focus:border-capri focus:outline-none transition-colors resize-none"
                    ></textarea>
                  </div>
                  <button className="w-full glass-button px-6 py-3 rounded-lg text-offwhite font-semibold blue-gradient glow-button">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 section-padding border-t border-cream">
        <div className="wide-container">
          <div className="glass p-8 rounded-2xl glow">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h3 className="text-2xl font-bold text-capri mb-2">MizeUp</h3>
                <p className="text-charcoal">
                  Streamlining therapy practice management and billing.
                </p>
              </div>
              <div className="flex space-x-6">
                <a href="#" className="text-charcoal hover:text-capri transition-colors">About</a>
                <a href="#" className="text-charcoal hover:text-capri transition-colors">Contact</a>
                <a href="#" className="text-charcoal hover:text-capri transition-colors">Privacy Policy</a>
                <a href="#" className="text-charcoal hover:text-capri transition-colors">Terms</a>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-cream text-center text-charcoal">
              <p>&copy; 2024 MizeUp. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}