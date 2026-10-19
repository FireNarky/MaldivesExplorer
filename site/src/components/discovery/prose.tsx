export function Prose({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  if (paragraphs.length === 0) return null;
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
    </>
  );
}

export function Coordinates({
  latitude,
  longitude,
}: {
  latitude: string | null;
  longitude: string | null;
}) {
  if (!latitude || !longitude) return null;
  return (
    <p>
      Coordinates: {latitude}, {longitude}
    </p>
  );
}
