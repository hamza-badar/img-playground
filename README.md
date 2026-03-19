# Image Playground

Image Playground is a browser-first media utility built with Vite, React, TypeScript, Tailwind CSS, and modular ShadCN-style UI components. It lets users upload, paste, or fetch media by URL and then convert or optimize files directly in the browser.

## Features

- GIF to MP4 conversion with `ffmpeg.wasm`
- Video to GIF conversion with adjustable FPS, quality, and duration
- Image compression toward a target size in KB with `browser-image-compression`
- Image resizing with `px`, `cm`, `mm`, `inch`, and `%` units using the Canvas API
- Drag and drop uploads with `react-dropzone`
- Clipboard intake with `navigator.clipboard.read()` plus keyboard paste fallback
- Result download, copy-to-clipboard for images, and draggable download link
- Metadata preview for both source and output assets
- Responsive UI with a built-in dark mode toggle

## Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- ShadCN-style component structure
- `react-dropzone`
- `@ffmpeg/ffmpeg`
- `browser-image-compression`

## Getting Started

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project Structure

```text
image-playground
├── public
├── src
│   ├── components
│   │   ├── ui
│   │   ├── Preview.tsx
│   │   ├── ResultViewer.tsx
│   │   ├── ToolTabs.tsx
│   │   └── UploadArea.tsx
│   ├── hooks
│   ├── lib
│   ├── tools
│   ├── types
│   ├── utils
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── index.html
├── package.json
├── postcss.config.cjs
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts
```

## Browser Notes

- `navigator.clipboard.read()` works best in secure contexts and may require user interaction.
- Safari may restrict clipboard write access, so image copy is best-effort with graceful fallback messaging.
- `ffmpeg.wasm` is lazy-loaded only when a conversion tool needs it, which keeps first load lighter for Vercel static hosting.

## Vercel Deployment

1. Push the project to GitHub.
2. In Vercel, choose **Add New Project** and import the repository.
3. Keep the framework preset as **Vite**.
4. Confirm:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy.

The included [`vercel.json`](/Users/hamzabadar/Drive/C/development/img-playground/vercel.json) is configured for static output and SPA routing.

## Free Tier Notes

- The app is static-first and does not require a dedicated backend server.
- Media processing happens in the browser wherever possible.
- `browser-image-compression` uses web workers for compression tasks.
- `ffmpeg.wasm` stays client-side, which avoids server compute costs for conversions.
