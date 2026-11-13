import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Logo, LogoMark } from "@/components/Logo";

const meta = {
  title: "UI/Logo",
  component: Logo,
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = {
  args: { size: 56 },
};

export const MarkAnimated: Story = {
  render: () => <LogoMark size={64} animate />,
};
