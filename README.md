<div align="center">
  <h1>TSX2Slides</h1>
  <p><strong>Convert TSX/JSX Components to PDF or PPTX Presentations</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
  
</div>

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Support](#support)

---

## 🎯 Overview

**TSX2Slides** is a powerful, privacy-focused web application that converts React TSX/JSX components into professional PDF or PowerPoint presentations. Built with enterprise-grade standards, it operates entirely offline within your browser, ensuring complete data privacy and security.

The application leverages in-browser TypeScript transpilation to render React components and accurately extract their visual layout into presentation formats without any external dependencies or cloud services.

### Key Benefits

- **🔒 Privacy First**: All processing happens locally in your browser - no data leaves your machine
- **⚡ Zero Dependencies**: No external APIs, CDNs, or cloud services required
- **🎨 Accurate Rendering**: Preserves exact component layouts, styles, and visual hierarchy
- **📦 Portable**: Works offline after initial load - perfect for secure environments
- **🚀 Fast**: Instant transpilation and export with no network latency

---

## ✨ Features

### Core Capabilities

- **TSX/JSX Support**: Full support for TypeScript and JavaScript React components
- **Dual Export Formats**: Generate both PDF (A4 landscape) and PPTX (16:9) presentations
- **In-Browser Transpilation**: Embedded TypeScript compiler eliminates external dependencies
- **Visual Fidelity**: Accurate DOM geometry mapping preserves your component's exact appearance
- **Standard Fonts**: Reliable text rendering without missing glyphs or font issues
- **Drag & Drop Interface**: Intuitive file upload with visual feedback
- **Real-time Preview**: See your component render before export

### Technical Features

- React 19.2+ with latest JSX Transform
- TypeScript 5.8 with strict type checking
- Vite-powered development with HMR (Hot Module Replacement)
- Modern ES modules architecture
- Responsive UI with Lucide icons
- Zero-config setup

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Environment                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  File Upload │───▶│  TypeScript  │───▶│   React      │  │
│  │  (TSX/JSX)   │    │  Transpiler  │    │   Renderer   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                   │           │
│                                                   ▼           │
│                                          ┌──────────────┐    │
│                                          │ Hidden Stage │    │
│                                          │  1280x720    │    │
│                                          └──────────────┘    │
│                                                   │           │
│                              ┌────────────────────┴───────┐  │
│                              ▼                            ▼  │
│                     ┌──────────────┐           ┌──────────────┐
│                     │   jsPDF      │           │  PptxGenJS   │
│                     │ PDF Generator│           │PPTX Generator│
│                     └──────────────┘           └──────────────┘
│                              │                            │  │
│                              └────────────────────────────┘  │
│                                          ▼                    │
│                                   ┌──────────────┐           │
│                                   │   Download   │           │
│                                   └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Processing Pipeline

1. **File Upload**: User uploads TSX/JSX component file
2. **Transpilation**: TypeScript compiler converts TSX to executable JavaScript
3. **Rendering**: Component renders in a hidden 1280×720 canvas
4. **Layout Extraction**: DOM geometry is analyzed and mapped
5. **Export Generation**: Layout is converted to PDF or PPTX format
6. **Download**: Final document is delivered to the user

---

## 📋 Prerequisites

Before installing TSX2Slides, ensure your system meets these requirements:

### System Requirements

- **Node.js**: v18.x or higher (v20.x LTS recommended)
- **npm**: v9.x or higher (comes with Node.js)
- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 2GB RAM available
- **Browser**: Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Development Tools (Optional)

- **Git**: For version control
- **VS Code**: Recommended IDE with TypeScript support
- **Node Version Manager** (nvm): For managing Node.js versions

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should show v18.x or higher

# Check npm version
npm --version   # Should show v9.x or higher

# Check Git (optional)
git --version
```

---

## 🚀 Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/nowusman/tsx2slides.git

# Navigate to project directory
cd tsx2slides

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Installation Steps (Detailed)

#### 1. Clone the Repository

```bash
# Using HTTPS
git clone https://github.com/nowusman/tsx2slides.git

# OR using SSH
git clone git@github.com:nowusman/tsx2slides.git

# Navigate to the project
cd tsx2slides
```

#### 2. Install Dependencies

```bash
# Install all required packages
npm install

# This will install:
# - Production dependencies (React, TypeScript, jsPDF, PptxGenJS, etc.)
# - Development dependencies (Vite, type definitions, etc.)
```

#### 3. Verify Installation

```bash
# Check if all dependencies are installed correctly
npm list --depth=0

# Run a build test
npm run build
```

#### 4. Start Development Server

```bash
# Start the Vite development server
npm run dev

# Expected output:
# VITE v6.2.0  ready in XXX ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

### Alternative Installation Methods

#### Using Yarn

```bash
# Install Yarn globally (if not already installed)
npm install -g yarn

# Install dependencies
yarn install

# Start development server
yarn dev
```

#### Using pnpm

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Docker Installation (Optional)

```bash
# Build Docker image
docker build -t tsx2slides .

# Run container
docker run -p 5173:5173 tsx2slides
```

*Note: A Dockerfile is not currently included but can be added if needed for containerized deployments.*

---

## 💻 Usage

### Basic Workflow

1. **Start the Application**
   ```bash
   npm run dev
   ```

2. **Open in Browser**
   - Navigate to `http://localhost:5173`

3. **Upload Component**
   - Drag and drop your `.tsx` or `.jsx` file into the upload area
   - Or click to browse and select a file

4. **Select Export Format**
   - Choose **PDF** for A4 landscape document
   - Choose **PPTX** for PowerPoint 16:9 presentation

5. **Export**
   - Click the export button
   - Your file will download automatically

### Example Component

Create a simple TSX component to test:

```tsx
// example.tsx
import React from 'react';

export default function Slide() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#1e293b',
      color: '#ffffff',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        Welcome to TSX2Slides
      </h1>
      <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>
        Convert React components to presentations
      </p>
    </div>
  );
}
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The production build will be created in the `dist/` directory and can be deployed to any static hosting service.

---

## ⚙️ Configuration

### Vite Configuration

The project uses Vite for development and building. Configuration is in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Add custom configuration here
})
```

### TypeScript Configuration

TypeScript settings are defined in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    // ... other options
  }
}
```

### Customization Options

- **Canvas Size**: Modify the render stage dimensions in the service layer
- **Export Settings**: Adjust PDF/PPTX parameters in the export services
- **Styling**: Customize UI appearance in `styles.css`

---

## 🛠️ Technology Stack

### Frontend Framework

- **React 19.2.3**: Modern UI component library with latest JSX Transform
- **TypeScript 5.8.2**: Type-safe JavaScript with advanced type features

### Build Tools

- **Vite 6.2.0**: Next-generation frontend build tool with instant HMR
- **@vitejs/plugin-react 5.0.0**: Official Vite plugin for React support

### Export Libraries

- **jsPDF 3.0.4**: Client-side PDF generation
- **PptxGenJS 4.0.1**: PowerPoint presentation generation

### UI Components

- **Lucide React 0.562.0**: Beautiful, consistent icon library

### Type Definitions

- **@types/node 22.14.0**: Node.js type definitions for build scripts

---

## 📁 Project Structure

```
tsx2slides/
├── .git/                    # Git version control
├── .gitignore              # Git ignore patterns
├── components/             # Reusable React components
├── services/               # Business logic and export services
├── App.tsx                 # Main application component
├── index.html              # HTML entry point
├── index.tsx               # Application entry point
├── LICENSE                 # MIT license file
├── metadata.json           # Project metadata
├── package.json            # Dependencies and scripts
├── README.md               # This file
├── styles.css              # Global styles
├── tsconfig.json           # TypeScript configuration
├── types.ts                # Shared type definitions
└── vite.config.ts          # Vite configuration
```

### Key Directories

- **`components/`**: Modular, reusable UI components
- **`services/`**: Core business logic for transpilation and export
- **`App.tsx`**: Main application orchestration
- **`types.ts`**: Centralized TypeScript type definitions

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Process

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/tsx2slides.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Write clean, documented code
   - Follow existing code style
   - Add tests if applicable

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Then create a Pull Request on GitHub
   ```

### Coding Standards

- Use TypeScript for all new code
- Follow React best practices and hooks guidelines
- Maintain consistent code formatting
- Write meaningful commit messages (Conventional Commits format)
- Document complex logic with comments

### Reporting Issues

- Use GitHub Issues to report bugs
- Include steps to reproduce
- Provide system information (OS, Node version, browser)
- Include relevant error messages or screenshots

---

## 🔒 Security

### Security Features

- **No External Communication**: All processing is local
- **No Data Collection**: Zero telemetry or analytics
- **Content Security**: User content never leaves the browser
- **Standard Libraries**: Well-maintained, audited dependencies

### Security Best Practices

When using TSX2Slides:

- Keep dependencies updated: `npm audit` and `npm update`
- Review uploaded component code before processing
- Use in trusted environments for sensitive data
- Follow standard web security practices

### Reporting Security Issues

If you discover a security vulnerability, please email: **security@example.com** (or create a private security advisory on GitHub)

**Do not** disclose security issues publicly until they have been addressed.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 M Usman Saleem

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## 📞 Support

### Getting Help

- **Documentation**: You're reading it! Check all sections above
- **GitHub Issues**: [Report bugs or request features](https://github.com/nowusman/tsx2slides/issues)
- **Discussions**: [Community discussions](https://github.com/nowusman/tsx2slides/discussions)

### Useful Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [PptxGenJS Documentation](https://gitbrent.github.io/PptxGenJS/)

---

## 🙏 Acknowledgments

Built with ❤️ using:
- React team for the amazing framework
- TypeScript team for type safety
- Vite team for blazing fast builds
- jsPDF and PptxGenJS maintainers

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/nowusman">M Usman Saleem</a></p>
  <p>⭐ Star this repo if you find it useful!</p>
</div>
