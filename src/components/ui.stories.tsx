import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Empty, PageTitle } from "@/components/ui";

const meta = {
  title: "UI/PageTitle",
  component: PageTitle,
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
  args: { title: "Library" },
};

export const WithSubText: Story = {
  args: { title: "Library", sub: "All songs, newest first" },
};

// Empty lives in the same file as PageTitle, so its stories render it directly.
export const EmptyState: Story = {
  args: { title: "" },
  render: () => <Empty title="No songs yet" body="Songs show up here once they are uploaded." />,
};

export const EmptyStateWithAction: Story = {
  args: { title: "" },
  render: () => (
    <Empty
      title="No songs yet"
      body="Songs show up here once they are uploaded."
      action={{ href: "/admin/upload", label: "Upload a song" }}
    />
  ),
};
