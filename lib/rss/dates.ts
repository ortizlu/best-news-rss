/** RSS readers (e.g. Dakboard) expect RFC 822 dates on &lt;pubDate&gt;. */
export function formatPubDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toUTCString();
}
