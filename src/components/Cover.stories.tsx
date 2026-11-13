import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Cover } from "@/components/Cover";

const meta = {
  title: "UI/Cover",
  component: Cover,
  args: { className: "w-40 rounded-xl" },
} satisfies Meta<typeof Cover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: { id: "song-1", url: "/icon.svg", alt: "Album art" },
};

// No cover uploaded: the song gets a gradient picked from its id.
export const Fallback: Story = {
  args: { id: "song-1", url: null },
};

export const FallbackOtherSong: Story = {
  args: { id: "song-2", url: null },
};
