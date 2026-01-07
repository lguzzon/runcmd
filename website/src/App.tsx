import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Download, ChevronRight, Code2, Zap, Shield, Moon, Sun, Github } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const Hero = () => {
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    fetch('/version.txt')
      .then(res => res.ok ? res.text() : '1.0.0')
      .then(text => setVersion(text.trim()))
      .catch(() => setVersion('1.0.0'));
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-48 md:pb-32">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 mb-8 font-medium text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            v{version} is now available
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Universal Script Runner for Modern Devs
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Write your scripts in JavaScript/TypeScript. Run them anywhere. 
            Automated environment setup, dependency management, and cross-platform compatibility out of the box.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="/runcmd.sh" 
              className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/25"
            >
              <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
              Download Script
            </a>
            <a 
              href="#docs" 
              className="flex items-center gap-2 px-8 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold transition-all"
            >
              Read Documentation
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: LucideIcon, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-8 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none backdrop-blur-sm"
  >
    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

const Features = () => {
  const features = [
    {
      icon: Terminal,
      title: "Cross-Platform",
      description: "Write once, run everywhere. Seamless execution on macOS, Linux, and Windows with unified behavior."
    },
    {
      icon: Zap,
      title: "Zero Config",
      description: "Automatic runtime installation. Bun is fetched and configured automatically if missing."
    },
    {
      icon: Shield,
      title: "Robust & Safe",
      description: "Atomic updates, self-healing environment, and smart path resolution for maximum reliability."
    },
    {
      icon: Code2,
      title: "Modern Tooling",
      description: "Built-in formatting, linting, and JSON validation powered by Biome and Shfmt."
    }
  ];

  return (
    <section id="features" className="py-24 bg-gray-50/50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Everything you need</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Stop writing fragile bash scripts. Start building robust automation with the full power of TypeScript.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
};

const Docs = () => (
  <section id="docs" className="py-24">
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <h2>Quick Start</h2>
        <div className="not-prose bg-gray-900 rounded-xl p-6 mb-8 overflow-x-auto">
          <code className="text-blue-400 text-sm font-mono">
            # Download and run (Unix/macOS)<br/>
            curl -fsSL https://lguzzon.github.io/runcmd/runcmd.sh -o runcmd.sh<br/>
            chmod +x runcmd.sh<br/>
            ./runcmd.sh my-script.mjs
          </code>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 mt-12">
          <div>
            <h3>Unix / macOS Features</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400">
              <li>Auto-installs Bun to <code>~/.bun</code></li>
              <li>Safe self-formatting capabilities</li>
              <li>Cross-platform path resolution</li>
              <li>Integrated debug timing</li>
            </ul>
          </div>
          <div>
            <h3>Windows Features</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400">
              <li>Supports .js, .mjs, .ts, and .py</li>
              <li>Auto-installs tools via PowerShell</li>
              <li>Enhanced debug modes (+d, +dd)</li>
              <li>Delayed variable expansion support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const App = () => {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <nav className="fixed w-full z-50 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-950/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Terminal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>runcmd</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com/lguzzon/runcmd" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <Features />
        <Docs />
      </main>

      <footer className="py-12 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} RunCmd. Open Source Software.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
