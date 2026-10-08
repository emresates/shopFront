export const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    value,
  );
// ShopApi timestamps are UTC. A value without an offset would otherwise be
// parsed as local time, so treat it as UTC; Intl then renders in local time.
export const parseApiDate = (value: string) =>
  new Date(/T[^Z+-]*$/i.test(value) ? `${value}Z` : value);
export const date = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(
    parseApiDate(value),
  );
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(parseApiDate(value));
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "İşlem tamamlanamadı.";
