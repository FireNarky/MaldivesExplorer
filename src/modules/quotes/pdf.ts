const pageWidth = 612;
const pageHeight = 792;
const margin = 54;
const leading = 14;
const fontSize = 11;
const linesPerPage = Math.floor((pageHeight - margin * 2) / leading);

function pdfLiteral(value: string): string {
  const latin = [...value]
    .map((char) => {
      const code = char.codePointAt(0) ?? 63;
      return code > 255 ? "?" : char;
    })
    .join("");
  return latin.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(value: string, width = 88): string[] {
  const paragraphs = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const wrapped: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      wrapped.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > width && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) wrapped.push(current);
  }
  return wrapped;
}

function contentStream(lines: string[]): string {
  const commands = [
    "BT",
    `/F1 ${fontSize} Tf`,
    `${margin} ${pageHeight - margin} Td`,
    `${leading} TL`,
  ];
  lines.forEach((line, index) => {
    if (index > 0) commands.push("T*");
    commands.push(`(${pdfLiteral(line)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

export function renderQuotePdf(lines: string[]): Uint8Array {
  const wrapped = lines.flatMap((line) => wrapLine(line));
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += linesPerPage) {
    pages.push(wrapped.slice(index, index + linesPerPage));
  }
  if (pages.length === 0) pages.push(["Maldives Explorer"]);

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  let length = chunks[0]?.byteLength ?? 0;
  const offsets = [0];

  function add(body: string): number {
    const id = offsets.length;
    const text = `${id} 0 obj\n${body}\nendobj\n`;
    offsets.push(length);
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    length += bytes.byteLength;
    return id;
  }

  const fontId = 3;
  const pageIds = pages.map((_, index) => 4 + index * 2);
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  pages.forEach((page, index) => {
    const stream = contentStream(page);
    const streamBytes = encoder.encode(stream);
    const pageId = pageIds[index];
    const contentId = (pageId ?? 0) + 1;
    if (pageId !== offsets.length) {
      throw new Error("The quote PDF page numbering is out of order.");
    }
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    );
    const header = `${contentId} 0 obj\n<< /Length ${streamBytes.byteLength} >>\nstream\n`;
    const footer = "\nendstream\nendobj\n";
    offsets.push(length);
    const headerBytes = encoder.encode(header);
    const footerBytes = encoder.encode(footer);
    chunks.push(headerBytes, streamBytes, footerBytes);
    length += headerBytes.byteLength + streamBytes.byteLength + footerBytes.byteLength;
  });

  const xrefAt = length;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const pdf = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, cursor);
    cursor += chunk.byteLength;
  }
  return pdf;
}
