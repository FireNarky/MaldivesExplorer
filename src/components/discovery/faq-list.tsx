import type { PublicFaq } from "@/modules/discovery/types";

export function FaqList({
  items,
  heading = "Questions",
}: {
  items: PublicFaq[];
  heading?: string | null;
}) {
  if (items.length === 0) return null;
  const Question = heading ? "h3" : "h2";
  return (
    <section className="grid gap-4">
      {heading ? <h2>{heading}</h2> : null}
      <ul className="grid gap-4">
        {items.map((item) => (
          <li key={item.id} className="grid gap-2">
            <Question>{item.question}</Question>
            <p>{item.answer}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
