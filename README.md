# 📚 RoboDesk Learning Portal

Welcome to the **RoboDesk Technical Documentation Portal**! This is a high-performance, Docs-as-Code platform built with Next.js to house the technical manuals, system architecture, and operational procedures for the RoboDesk AI-powered interaction management system.

## ✨ Features

- **Docs-as-Code Architecture:** All documentation lives in a completely separated Git submodule repository. This ensures developers and technical writers can work independently without cross-repository interference.
- **Interactive Mermaid Support:** Full support for rendering complex, full-width Mermaid.js flowchart and architecture diagrams directly from Markdown code blocks.
- **Dynamic Syntax Highlighting:** Integrated code block highlighting with optimized, localized Prism themes for 100+ languages.
- **Interactive Markdown Editing:** In-browser editing interface with live saving capabilities directly to the local file system.
- **Next-Gen Aesthetics:** Features a stunning customized `Three.js` interactive background (`PixelBlast`), dynamic dark/light mode, and beautifully scaled typography using Tailwind CSS.
- **Zoomable Media:** Automatically scales and provisions a sleek click-to-zoom modal for all embedded documentation imagery and system screenshots.

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js 18+ installed on your system.

### 1. Clone the Repository
Because the documentation content is decoupled, you must clone this repository **with its submodules** to pull down the `.md` content files.

```bash
git clone --recurse-submodules https://github.com/your-org/learning-portal.git
cd learning-portal
```

*(If you already cloned it normally, you can initialize the submodule by running `git submodule update --init`)*

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the documentation dashboard!

## 📁 Project Structure

```text
├── app/                  # Next.js App Router pages and global CSS
├── components/           # Reusable React components (Sidebar, MarkdownRenderer, etc.)
├── docs/                 # 🔗 GIT SUBMODULE: Contains all Markdown documentation content
├── lib/                  # Utilities for parsing Markdown, Gray-matter, and file-system ops
└── public/               # Static assets and media files
```

## ✍️ Writing Documentation

To add or edit documentation, simply navigate to the `docs/` folder.
- Documents are standard Markdown (`.md`) files.
- We use **Frontmatter** to organize files automatically in the sidebar navigation:

```yaml
---
title: "My New Guide"
description: "A short summary of what this guide covers."
category: "Features"
order: 2
---
```

Once you've made changes to the documentation, remember that the `docs/` directory is its own Git repository. You must commit and push changes inside the `docs/` folder independently of the main portal code!

## 🛠 Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Markdown parsing:** `react-markdown`, `remark-gfm`, `rehype-raw`
- **Diagrams:** [Mermaid.js](https://mermaid.js.org/)
- **Visual Effects:** `Three.js` & `postprocessing`
