import { FieldError } from "@/components/ui/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EditorField = {
  name: string;
  label: string;
  value: string;
  type?: "text" | "textarea" | "select" | "number" | "datetime-local";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
};

export function EditorForm({
  action,
  error,
  fields,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  error?: string;
  fields: EditorField[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid max-w-[65ch] gap-4">
      {error ? <FieldError>{error}</FieldError> : null}
      {fields.map((field) => (
        <div key={field.name} className="grid gap-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              name={field.name}
              defaultValue={field.value}
              required={field.required}
            />
          ) : field.type === "select" ? (
            <select
              id={field.name}
              name={field.name}
              defaultValue={field.value}
              required={field.required}
              className="min-h-11 rounded-sm border border-border bg-white px-4 text-base text-ink"
            >
              <option value="">Choose</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={field.name}
              name={field.name}
              type={
                field.type === "number"
                  ? "number"
                  : field.type === "datetime-local"
                    ? "datetime-local"
                    : "text"
              }
              defaultValue={field.value}
              required={field.required}
            />
          )}
        </div>
      ))}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
