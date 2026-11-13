import { render, screen } from "@testing-library/react";
import { Cover } from "@/components/Cover";

describe("Cover", () => {
  it("shows the image with its alt text when there is a cover", () => {
    render(<Cover id="song-1" url="/cover.jpg" alt="Album art" />);

    expect(screen.getByRole("img", { name: "Album art" })).toHaveAttribute("src", "/cover.jpg");
  });

  it("lazy-loads the image unless it has priority", () => {
    const { rerender } = render(<Cover id="song-1" url="/cover.jpg" alt="Album art" />);
    expect(screen.getByRole("img", { name: "Album art" })).toHaveAttribute("loading", "lazy");

    rerender(<Cover id="song-1" url="/cover.jpg" alt="Album art" priority />);
    expect(screen.getByRole("img", { name: "Album art" })).toHaveAttribute("loading", "eager");
  });

  it("shows a gradient hidden from screen readers when there is no cover", () => {
    const { container } = render(<Cover id="song-1" url={null} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("gives the same song the same gradient every time", () => {
    const first = render(<Cover id="song-1" url={null} />).container.firstChild as HTMLElement;
    const second = render(<Cover id="song-1" url={null} />).container.firstChild as HTMLElement;

    expect(first.style.background).toBe(second.style.background);
  });
});
