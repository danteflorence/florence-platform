// Type shim for the Google <model-viewer> web component so it can be used
// as a JSX element under React + strict TypeScript.
// Docs: https://modelviewer.dev/  (Apache-2.0)
import type React from "react";

type ModelViewerAttributes = {
  src?: string;
  alt?: string;
  poster?: string;
  "camera-controls"?: boolean | "";
  "touch-action"?: string;
  "auto-rotate"?: boolean | "";
  "auto-rotate-delay"?: number | string;
  "rotation-per-second"?: string;
  "interaction-prompt"?: "auto" | "none";
  "camera-orbit"?: string;
  "min-camera-orbit"?: string;
  "max-camera-orbit"?: string;
  "field-of-view"?: string;
  "camera-target"?: string;
  exposure?: number | string;
  "shadow-intensity"?: number | string;
  "shadow-softness"?: number | string;
  "environment-image"?: string;
  "disable-zoom"?: boolean | "";
  "disable-pan"?: boolean | "";
  loading?: "auto" | "lazy" | "eager";
  reveal?: "auto" | "interaction" | "manual";
  "ar"?: boolean | "";
  style?: React.CSSProperties;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & ModelViewerAttributes,
        HTMLElement
      >;
    }
  }
}

export {};
