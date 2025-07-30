'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { Card, SecurityCard } from '../ui/OriginalCard';
import { Button } from '../ui/Button';
import { SecurityIcons, StatusIndicator } from '../ui/DesignSystem';
import { ThemeToggle } from '@/components/theme-toggle';
import { FloatingActionButton } from '@/components/floating-action-button';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: "easeOut" }
};

export const HomepageRedesigned: React.FC = () => {
  const router = useRouter();
  const { wallet, isAuthenticated } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    // Check authentication status
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && wallet) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, wallet, router]);

  const features = [
    {
      icon: SecurityIcons.Shield,
      title: 'Zero Trust Security',
      description: 'Military-grade encryption with multiple security levels to protect your documents.',
      color: 'primary' as const,
    },
    {
      icon: SecurityIcons.Signature,
      title: 'Digital Signatures',
      description: 'Cryptographically secure signatures with blockchain verification.',
      color: 'success' as const,
    },
    {
      icon: SecurityIcons.Verified,
      title: 'Document Verification',
      description: 'Instant verification of document authenticity and signature validity.',
      color: 'primary' as const,
    },
    {
      icon: SecurityIcons.Activity,
      title: 'Audit Trails',
      description: 'Complete audit logs with timestamps, IP addresses, and verification history.',
      color: 'warning' as const,
    },
  ];

  const securityLevels = [
    {
      level: 'standard' as const,
      title: 'Standard Security',
      description: 'AES-CBC encryption with password protection',
      features: ['Basic encryption', '10K PBKDF2 iterations', 'Standard security'],
    },
    {
      level: 'enhanced' as const,
      title: 'Enhanced Security',
      description: 'Advanced encryption with Web Crypto API',
      features: ['AES-GCM encryption', '310K PBKDF2 iterations', 'Enhanced security'],
      recommended: true,
    },
    {
      level: 'maximum' as const,
      title: 'Maximum Security',
      description: 'Military-grade encryption with steganography',
      features: ['AES-GCM + Steganography', '310K PBKDF2 iterations', 'Maximum security'],
    },
  ];

  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-background via-neutral-900 to-background dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card variant="glass" padding="lg" className="text-center">
            <motion.div
              className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4"
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <SecurityIcons.Shield className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h2
              className="text-xl font-bold text-foreground mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Loading SignTusk
            </motion.h2>
            <motion.p
              className="text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Initializing secure environment...
            </motion.p>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-neutral-900 to-background dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Navigation Header */}
      <motion.nav
        className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <motion.div
                className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <SecurityIcons.Shield className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold text-foreground">SignTusk</span>
            </motion.div>

            {/* Navigation Actions */}
            <motion.div
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <ThemeToggle />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => router.push('/login')}
                  icon={<SecurityIcons.Key className="w-4 h-4" />}
                >
                  Sign In
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="primary"
                  onClick={() => router.push('/signup')}
                  icon={<SecurityIcons.Shield className="w-4 h-4" />}
                >
                  Get Started
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        className="relative py-20 px-4 sm:px-6 lg:px-8"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            className="w-24 h-24 bg-gradient-to-r from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary-500/25"
            variants={scaleIn}
            whileHover={{
              scale: 1.1,
              rotate: [0, -10, 10, -10, 0],
              transition: { duration: 0.5 }
            }}
          >
            <SecurityIcons.Shield className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h1
            className="text-5xl md:text-6xl font-bold text-foreground mb-6"
            variants={fadeInUp}
          >
            Secure Document
            <motion.span
              className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            > Signing</motion.span>
          </motion.h1>

          <motion.p
            className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            Sign documents securely with blockchain technology. Create your digital signing identity with
            military-grade encryption and cryptographic verification.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            variants={fadeInUp}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="xl"
                onClick={() => router.push('/signup')}
                icon={<SecurityIcons.Shield className="w-5 h-5" />}
              >
                Create Secure Identity
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="xl"
                variant="outline"
                onClick={() => router.push('/login')}
                icon={<SecurityIcons.Key className="w-5 h-5" />}
              >
                Sign In
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              className="flex items-center space-x-2"
              variants={fadeInUp}
            >
              <StatusIndicator status="verified" size="sm" />
              <span className="text-sm">Zero Trust Security</span>
            </motion.div>
            <motion.div
              className="flex items-center space-x-2"
              variants={fadeInUp}
            >
              <StatusIndicator status="verified" size="sm" />
              <span className="text-sm">Blockchain Verified</span>
            </motion.div>
            <motion.div
              className="flex items-center space-x-2"
              variants={fadeInUp}
            >
              <StatusIndicator status="verified" size="sm" />
              <span className="text-sm">Military-Grade Encryption</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-20 px-4 sm:px-6 lg:px-8"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeInUp}
          >
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-foreground mb-4"
              variants={fadeInUp}
            >
              Enterprise-Grade Security Features
            </motion.h2>
            <motion.p
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              Built for organizations that require the highest levels of document security and verification.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card variant="glass" padding="lg" hover glow glowColor={feature.color}>
                    <div className="text-center">
                      <motion.div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${feature.color === 'primary' ? 'bg-primary-500/20' :
                          feature.color === 'success' ? 'bg-green-500/20' :
                            'bg-yellow-500/20'
                          }`}
                        whileHover={{
                          rotate: 360,
                          transition: { duration: 0.5 }
                        }}
                      >
                        <Icon className={`w-8 h-8 ${feature.color === 'primary' ? 'text-primary-400' :
                          feature.color === 'success' ? 'text-green-400' :
                            'text-yellow-400'
                          }`} />
                      </motion.div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.section>

      {/* Security Levels Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose Your Security Level
            </h2>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
              Select the security level that matches your organization's requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {securityLevels.map((level, index) => (
              <SecurityCard
                key={index}
                title={level.title}
                description={level.description}
                icon={<SecurityIcons.Lock className="w-6 h-6" />}
                securityLevel={level.level}
                hover
                className={`cursor-pointer ${level.recommended ? 'border-2 border-primary-500/50' : ''}`}
                onClick={() => router.push('/signup')}
              >
                <div className="space-y-3">
                  {level.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <SecurityIcons.Verified className="w-4 h-4 text-green-400" />
                      <span className="text-neutral-300 text-sm">{feature}</span>
                    </div>
                  ))}
                  {level.recommended && (
                    <div className="mt-4">
                      <span className="text-xs bg-primary-500/20 text-primary-300 px-3 py-1 rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}
                </div>
              </SecurityCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Card variant="glass" padding="xl" glow glowColor="primary">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Secure Your Documents?
            </h2>
            <p className="text-xl text-neutral-300 mb-8">
              Join thousands of organizations using SignTusk for secure document signing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="xl"
                onClick={() => router.push('/signup')}
                icon={<SecurityIcons.Shield className="w-5 h-5" />}
              >
                Start Free Trial
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => router.push('/import')}
                icon={<SecurityIcons.Key className="w-5 h-5" />}
              >
                Import Existing Identity
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <SecurityIcons.Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">SignTusk</span>
          </div>
          <p className="text-neutral-400 text-sm">
            © 2024 SignTusk. Secure document signing with blockchain technology.
          </p>
        </div>
      </footer>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
};

export default HomepageRedesigned;
