import React from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Home, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Layout } from '../components/Layout';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center p-4" role="main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mb-6"
          >
            <Search className="w-24 h-24 text-muted-foreground mx-auto" />
          </motion.div>

          <h1 className="text-4xl font-bold mb-2">404</h1>
          <h2 className="text-xl font-medium mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
}
