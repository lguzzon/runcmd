# RunCmd Website (Astro + Tailwind)

Static marketing site for the RunCmd project, built with Astro and Tailwind CSS. Bun is the package manager/runtime.

## 📋 Project Overview

The RunCmd website serves as the official documentation and marketing site for the RunCmd universal script runner project. It provides comprehensive documentation, usage examples, and project information.

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/) - Modern static site generator
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- **Build Tool**: Astro's built-in build system with Bun integration

## 📦 Prerequisites

- [Bun](https://bun.sh/) >= 1.3.5
- Node.js (for development tools, though Bun handles most operations)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/lguzzon/runcmd.git
cd runcmd/website

# Install dependencies
bun install
```

### Development

```bash
# Start development server
bun run dev

# Open http://localhost:4321 in your browser
```

### Production Build

```bash
# Build for production
bun run build

# Output is generated in the repository-level `public/` directory
# This directory is used for GitHub Pages deployment
```

## 📁 Project Structure

```text
website/
├── src/
│   ├── env.d.ts              # TypeScript environment declarations
│   ├── layouts/
│   │   └── BaseLayout.astro  # Main layout component
│   ├── pages/
│   │   └── index.astro       # Homepage
│   └── styles/
│       └── global.css        # Global styles
├── public/                   # Static assets (served as-is)
├── astro.config.mjs          # Astro configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── eslint.config.js          # ESLint configuration
└── postcss.config.js         # PostCSS configuration
```

## 🎨 Styling

The website uses Tailwind CSS for styling with the following key features:

- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Dark Mode**: Built-in dark theme support
- **Accessibility**: Semantic HTML and ARIA attributes
- **Performance**: PurgeCSS removes unused styles in production

## 📝 Content Management

### Homepage (`src/pages/index.astro`)

The homepage is built with Astro components and includes:

- **Hero Section**: Project introduction and download links
- **Features Grid**: Key features with icons
- **Documentation**: Quick start guide and examples
- **Footer**: Copyright and links

### Dynamic Content

- **Version Information**: Automatically loaded from `../version.txt`
- **GitHub Integration**: Links to repository and issues
- **Download Links**: Dynamic URLs for script downloads

## 🚀 Deployment

### GitHub Pages

The website is deployed to GitHub Pages using the following workflow:

1. **Build Process**: `bun run build` generates static files
2. **Output Directory**: Files are output to the repository-level `public/` directory
3. **GitHub Pages**: Serves from the `public/` directory

### CI/CD Pipeline

The deployment is automated via GitHub Actions in `.github/workflows/publish.yml`:

```yaml
- name: Install dependencies
  run: bun install --frozen-lockfile

- name: Build website
  run: bun run build
```

## 🛠️ Development Commands

```bash
bun run dev     # Start development server
bun run lint    # Run ESLint
bun run check   # Run Astro type checks
bun run build   # Build for production
```

## 📋 Configuration

### Astro Configuration (`astro.config.mjs`)

- **Output**: Static site generation
- **Integrations**: Tailwind CSS integration
- **Build Target**: Output to `../public` for GitHub Pages

### TypeScript Configuration (`tsconfig.json`)

- **Target**: ES2020 for modern browser support
- **Module**: ESNext for modern imports
- **JSX**: Astro's JSX transform

### Tailwind Configuration (`tailwind.config.js`)

- **Content**: Scans Astro and CSS files
- **Theme**: Custom color palette and spacing
- **Plugins**: Typography and forms plugins

## 🎯 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **CSS Features**: Grid, Flexbox, CSS Variables
- **JavaScript**: ES2020+ features

## 🔧 Customization

### Adding New Pages

1. Create a new `.astro` file in `src/pages/`
2. Export a default component
3. Add navigation links as needed

### Styling Components

1. Use Tailwind classes directly in Astro components
2. Create custom CSS in `src/styles/global.css`
3. Use CSS custom properties for theming

### Adding Assets

1. Place images in `public/` directory
2. Reference with absolute paths: `/image.png`
3. Use Astro's image optimization for better performance

## 📊 Performance

- **Bundle Size**: Optimized with Astro's partial hydration
- **CSS**: PurgeCSS removes unused styles
- **Images**: Optimized with modern formats
- **Caching**: Static assets with long cache headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes to the website
4. Test locally with `bun run dev`
5. Submit a pull request

## 📄 License

This website is part of the RunCmd project and is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Astro](https://astro.build/) for modern static site generation
- Styled with [Tailwind CSS](https://tailwindcss.com/) for rapid UI development
- Powered by [Bun](https://bun.sh/) for fast development and build times
