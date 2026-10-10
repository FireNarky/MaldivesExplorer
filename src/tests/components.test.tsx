import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { Circle } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FieldError } from "@/components/ui/field-error";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

describe("foundation components", () => {
  it("exposes names, errors, and loading text", async () => {
    const { container } = render(
      <form>
        <Label htmlFor="note">Note</Label>
        <Input id="note" name="note" invalid aria-describedby="note-error" />
        <FieldError id="note-error">Enter a note.</FieldError>
        <Textarea id="details" aria-label="Details" />
        <Button type="submit">Continue</Button>
        <Button type="button" loading>
          Continue
        </Button>
        <IconButton type="button" aria-label="Close">
          <Circle />
        </IconButton>
        <Badge tone="info">Foundation</Badge>
        <EmptyState title="Nothing here yet">The module has no records.</EmptyState>
        <ErrorState title="The page could not be displayed">Try the action again.</ErrorState>
      </form>,
    );

    expect(screen.getByLabelText("Note")).toHaveAttribute("aria-invalid", "true");
    const fieldError = container.querySelector("#note-error");
    expect(fieldError).toHaveTextContent("Enter a note.");
    expect(fieldError).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Loading" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
