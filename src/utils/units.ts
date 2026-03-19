const DPI = 96;

export function convertToPixels(value: number, unit: "px" | "cm" | "mm" | "inch" | "%", original: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return original;
  }

  switch (unit) {
    case "px":
      return Math.round(value);
    case "cm":
      return Math.round((value / 2.54) * DPI);
    case "mm":
      return Math.round((value / 25.4) * DPI);
    case "inch":
      return Math.round(value * DPI);
    case "%":
      return Math.round((original * value) / 100);
    default:
      return original;
  }
}
