import { render, screen } from "@testing-library/react";
import { Empty, PageTitle } from "@/components/ui";

describe("PageTitle", () => {
  it("shows the title as the page heading", () => {
    render(<PageTitle title="Library" />);

    expect(screen.getByRole("heading", { level: 1, name: "Library" })).toBeInTheDocument();
  });

  it("shows the sub text only when it is given", () => {
    const { rerender } = render(<PageTitle title="Library" />);
    expect(screen.queryByText("All songs")).not.toBeInTheDocument();

    rerender(<PageTitle title="Library" sub="All songs" />);
    expect(screen.getByText("All songs")).toBeInTheDocument();
  });
});

describe("Empty", () => {
  it("shows the title and body", () => {
    render(<Empty title="No songs yet" body="Upload the first one." />);

    expect(screen.getByRole("heading", { name: "No songs yet" })).toBeInTheDocument();
    expect(screen.getByText("Upload the first one.")).toBeInTheDocument();
  });

  it("links to the action when one is given", () => {
    render(<Empty title="No songs yet" body="Upload the first one." action={{ href: "/admin/upload", label: "Upload" }} />);

    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute("href", "/admin/upload");
  });
});
