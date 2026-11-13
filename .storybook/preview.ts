import type { Preview } from "@storybook/nextjs-vite";
// The app's own styles, so components look the same here as in the app.
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
  },
};

export default preview;
