/**
 * PDF + print utilities for the winning-coupon screen.
 *
 * Strategy:
 *  - `PrintableCoupon` renders a fixed-dimension coupon offscreen.
 *  - `downloadCouponPDF` snapshots it with html2canvas and embeds the image
 *    into a single A4 portrait page via jsPDF.
 *  - `printCoupon` defers to the browser's native print dialog; @media print
 *    CSS in globals.css hides the rest of the app so only the coupon prints.
 *
 * Both libraries are dynamic-imported so they don't ship in the SSR bundle.
 */

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

/** Filename per spec: siamese-star-vote-coupon-MEOW-4821.pdf */
function buildFilename(couponCode: string) {
  const safe = couponCode.replace(/[^A-Za-z0-9-]/g, "");
  return `siamese-star-vote-coupon-${safe}.pdf`;
}

/**
 * Snapshot the offscreen printable coupon and download it as a PDF.
 * Returns a promise so callers can show a loading state on the button.
 */
export async function downloadCouponPDF(
  elementId: string,
  couponCode: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const node = document.getElementById(elementId) as HTMLElement | null;
  if (!node) {
    throw new Error(`PrintableCoupon element with id "${elementId}" not found`);
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Render at 2x for crisp PDF output.
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#fdf5ec",
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  // Fit the coupon (3:4-ish) inside the A4 page with a comfortable margin.
  const marginX = 30;
  const maxWidth = A4_WIDTH_PT - marginX * 2;
  const aspect = canvas.height / canvas.width;
  const imgWidth = maxWidth;
  const imgHeight = imgWidth * aspect;

  const x = (A4_WIDTH_PT - imgWidth) / 2;
  const y = Math.max(30, (A4_HEIGHT_PT - imgHeight) / 2);

  // Cream page background so the printed page matches the brand.
  pdf.setFillColor(253, 245, 236); // #fdf5ec
  pdf.rect(0, 0, A4_WIDTH_PT, A4_HEIGHT_PT, "F");

  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);

  // Small footer line so the printed page is unambiguously branded.
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(90, 49, 20); // #5a3114
  pdf.text(
    "Siamese Cat Café · The Cat Mayor Election · Season 1",
    A4_WIDTH_PT / 2,
    A4_HEIGHT_PT - 24,
    { align: "center" },
  );

  pdf.save(buildFilename(couponCode));
}

/**
 * Open the browser print dialog. Global print CSS isolates the coupon so
 * only it prints; the rest of the page is hidden via @media print.
 */
export function printCoupon(): void {
  if (typeof window === "undefined") return;
  window.print();
}
