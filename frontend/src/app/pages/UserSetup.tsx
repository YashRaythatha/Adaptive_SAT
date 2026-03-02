import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ErrorMessage } from '../components/AnimatedComponents';
import { useUser } from '../context/UserContext';
import { api, ApiError } from '../api/client';

export function UserSetup() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    let ok = true;
    if (!name.trim()) {
      setNameError('Please enter your name');
      ok = false;
    } else setNameError('');
    if (!email.trim()) {
      setEmailError('Please enter your email');
      ok = false;
    } else if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Please enter a valid email address');
      ok = false;
    } else setEmailError('');
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const user = await api.createUser(name.trim(), email.trim());
      setUser(user);
      navigate('/');
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : 'Failed to create account. Please try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <a
        href="#main-content"
        className="absolute left-4 -top-full z-50 px-4 py-2 bg-primary text-primary-foreground rounded-md focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <motion.div
        id="main-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-lg border border-border shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="p-4 bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-full"
            >
              <GraduationCap className="w-12 h-12" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-semibold mb-2">Welcome to Adaptive SAT</h1>
            <p className="text-sm text-muted-foreground">
              Start your journey to SAT success. Create your account to begin.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                placeholder="Enter your full name"
                disabled={isSubmitting}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'name-error' : undefined}
              />
              {nameError && (
                <p id="name-error" className="text-sm text-destructive mt-1" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="Enter your email"
                disabled={isSubmitting}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              <p className="text-xs text-muted-foreground mt-1">We won’t share your email.</p>
              {emailError && (
                <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Get Started'}
            </Button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-center text-muted-foreground mt-6"
          >
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-foreground">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
