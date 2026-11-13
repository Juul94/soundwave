import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  // Stories sit next to the component they show, like the tests do.
  stories: ["../src/**/*.stories.tsx"],
  // Checks every story for accessibility problems (contrast, missing labels).
  addons: ["@storybook/addon-a11y"],
};

export default config;
