// Emits a <script type="application/ld+json"> block. Server component — the
// JSON is rendered into the HTML at build time, ready for crawlers.
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
