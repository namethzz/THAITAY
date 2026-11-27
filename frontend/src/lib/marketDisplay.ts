import type { Movement } from "./chartData";

export const movements = {
  up: {label: "ราคาขึ้น", color: "#bd4246"},
  down: {label: "ราคาลง", color: "#24765b"},
  steady: {label: "ราคาคงที่", color: "#65758a"},
} satisfies Record<Movement, {label: string; color: string}>;
export const statuses = Object.keys(movements) as Movement[];
const number = new Intl.NumberFormat("th-TH", {maximumFractionDigits: 4});
export const priceText = (n: number | null) => n === null ? "—" : number.format(n);
export const percentText = (n: number | null) => n === null ? "—" : (n > 0 ? "+" : "") + n.toFixed(2) + "%";
