export const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    value,
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(
    new Date(value),
  );
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "İşlem tamamlanamadı.";
