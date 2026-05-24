"use client";

import type { Cat, Coupon } from "@/lib/types";

type PrintableCouponProps = {
  cat: Cat;
  coupon: Coupon;
  /** Voter's display name (printed under the redemption line, if available). */
  voterName?: string;
  /**
   * DOM id used by downloadCouponPDF + @media print to find this element.
   * Defaults to "printable-coupon" — the value used by RewardResultModal.
   */
  id?: string;
};

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Fixed-dimension printable coupon designed to be:
 *  - captured by html2canvas for PDF export
 *  - shown alone via @media print when the user prints
 *
 * It is rendered offscreen (left: -10000px) in normal view, and revealed by
 * the print stylesheet when the print dialog is open. Avoids next/image to
 * sidestep CORS issues with the external photo host — the printable uses
 * brand SVGs and typography only.
 */
export default function PrintableCoupon({
  cat,
  coupon,
  voterName,
  id = "printable-coupon",
}: PrintableCouponProps) {
  const issued = formatDate(coupon.validUntil - 7 * 24 * 60 * 60 * 1000);
  const expires = formatDate(coupon.validUntil);

  return (
    <div
      id={id}
      className="printable-coupon"
      // The hidden offscreen position keeps it out of the visible viewport
      // while still being painted (required by html2canvas). The print CSS
      // in globals.css overrides this when the print dialog is open.
      style={{
        position: "absolute",
        left: "-10000px",
        top: 0,
        width: 720,
        height: 960,
        backgroundColor: "#fdf5ec",
        // Inline font stack so html2canvas captures the same look in PDF.
        fontFamily:
          "'Quicksand', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: "#5a3114",
        // Subtle vignette + brand wash
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(187,221,211,0.35), transparent 45%), radial-gradient(circle at 100% 100%, rgba(231,158,174,0.30), transparent 45%)",
        boxSizing: "border-box",
        padding: 0,
      }}
      aria-hidden="true"
    >
      {/* Outer card */}
      <div
        style={{
          margin: 36,
          height: 960 - 72,
          width: 720 - 72,
          backgroundColor: "#ffffff",
          border: "2px solid rgba(90,49,20,0.18)",
          borderRadius: 24,
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Top gradient band */}
        <div
          style={{
            height: 10,
            background:
              "linear-gradient(90deg, #bbddd3 0%, #e79eae 50%, #d57a8e 100%)",
          }}
        />

        {/* Decorative paw watermarks (corners) */}
        <PawSvg
          style={{
            position: "absolute",
            top: 36,
            right: 24,
            width: 80,
            height: 80,
            color: "rgba(231,158,174,0.22)",
          }}
        />
        <PawSvg
          style={{
            position: "absolute",
            bottom: 90,
            left: 18,
            width: 64,
            height: 64,
            color: "rgba(187,221,211,0.32)",
            transform: "rotate(-18deg)",
          }}
        />
        <HeartSvg
          style={{
            position: "absolute",
            top: 220,
            left: 28,
            width: 28,
            height: 28,
            color: "rgba(231,158,174,0.35)",
          }}
        />
        <HeartSvg
          style={{
            position: "absolute",
            bottom: 180,
            right: 36,
            width: 22,
            height: 22,
            color: "rgba(213,122,142,0.28)",
          }}
        />

        {/* Header block */}
        <div style={{ padding: "26px 36px 0", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 999,
              backgroundColor: "rgba(231,158,174,0.18)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#d57a8e",
            }}
          >
            <CrownSvg style={{ width: 12, height: 12 }} />
            Reward Coupon
          </div>

          <h1
            style={{
              fontFamily:
                "'Playfair Display', Georgia, 'Times New Roman', serif",
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.05,
              margin: "14px 0 4px",
              color: "#5a3114",
            }}
          >
            Siamese Star Vote
          </h1>
          <p
            style={{
              fontFamily:
                "'Playfair Display', Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "rgba(90,49,20,0.65)",
              margin: 0,
            }}
          >
            The Cat Mayor Election of Siamese Cat Café
          </p>
        </div>

        {/* Divider with hearts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "26px 56px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              borderTop: "1px dashed rgba(90,49,20,0.3)",
            }}
          />
          <HeartSvg
            style={{ width: 16, height: 16, color: "#e79eae" }}
          />
          <PawSvg style={{ width: 18, height: 18, color: "#5a3114" }} />
          <HeartSvg
            style={{ width: 16, height: 16, color: "#e79eae" }}
          />
          <div
            style={{
              flex: 1,
              height: 1,
              borderTop: "1px dashed rgba(90,49,20,0.3)",
            }}
          />
        </div>

        {/* Title + cat */}
        <div style={{ textAlign: "center", padding: "30px 36px 0" }}>
          <h2
            style={{
              fontFamily:
                "'Playfair Display', Georgia, 'Times New Roman', serif",
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.05,
              margin: 0,
              color: "#5a3114",
            }}
          >
            {coupon.title}
          </h2>
          <p
            style={{
              marginTop: 14,
              fontSize: 16,
              color: "rgba(90,49,20,0.75)",
            }}
          >
            Reward shared by{" "}
            <span
              style={{
                fontFamily:
                  "'Playfair Display', Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontWeight: 700,
                color: "#d57a8e",
              }}
            >
              {cat.name}
            </span>
          </p>
        </div>

        {/* Code box */}
        <div
          style={{
            margin: "30px 56px 0",
            padding: "18px 22px",
            borderRadius: 18,
            border: "2px dashed rgba(90,49,20,0.35)",
            backgroundColor: "rgba(187,221,211,0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(90,49,20,0.55)",
              }}
            >
              Coupon Code
            </div>
            <div
              style={{
                fontFamily:
                  "'Playfair Display', Georgia, 'Times New Roman', serif",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "0.18em",
                color: "#5a3114",
                marginTop: 4,
              }}
            >
              {coupon.code}
            </div>
          </div>
          <PawSvg
            style={{ width: 44, height: 44, color: "rgba(90,49,20,0.55)" }}
          />
        </div>

        {/* Dates */}
        <div
          style={{
            display: "flex",
            margin: "20px 56px 0",
            gap: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(90,49,20,0.12)",
              backgroundColor: "rgba(255,255,255,0.7)",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(90,49,20,0.55)",
              }}
            >
              Issued
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {issued}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(231,158,174,0.45)",
              backgroundColor: "rgba(231,158,174,0.10)",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#d57a8e",
              }}
            >
              Expires
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginTop: 2,
                color: "#5a3114",
              }}
            >
              {expires}
            </div>
          </div>
        </div>

        {/* Redemption instructions */}
        <div
          style={{
            margin: "26px 56px 0",
            padding: "14px 16px",
            borderRadius: 14,
            backgroundColor: "rgba(253,245,236,0.7)",
            border: "1px solid rgba(90,49,20,0.08)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: "rgba(90,49,20,0.85)",
            }}
          >
            Show this coupon to Siamese Cat Café staff to redeem.
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "rgba(90,49,20,0.65)",
            }}
          >
            Valid for one-time use only.
          </p>
          {voterName && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                color: "rgba(90,49,20,0.7)",
              }}
            >
              Issued to{" "}
              <span
                style={{
                  fontFamily:
                    "'Playfair Display', Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 700,
                  color: "#5a3114",
                }}
              >
                {voterName}
              </span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 22,
            textAlign: "center",
            padding: "0 36px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: "rgba(90,49,20,0.55)",
              fontStyle: "italic",
            }}
          >
            <PawSvg
              style={{ width: 12, height: 12, color: "rgba(90,49,20,0.45)" }}
            />
            Manual staff verification required.
            <PawSvg
              style={{ width: 12, height: 12, color: "rgba(90,49,20,0.45)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Local SVG glyphs (inline so html2canvas captures them) ----------

function PawSvg({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" style={style} aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="32" cy="42" rx="14" ry="11" />
        <ellipse cx="14" cy="26" rx="6" ry="8" />
        <ellipse cx="50" cy="26" rx="6" ry="8" />
        <ellipse cx="22" cy="12" rx="5" ry="7" />
        <ellipse cx="42" cy="12" rx="5" ry="7" />
      </g>
    </svg>
  );
}

function HeartSvg({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 21s-7.5-4.6-9.5-9.4C1 7.7 3.6 4 7.2 4c2 0 3.7 1 4.8 2.6C13.1 5 14.8 4 16.8 4 20.4 4 23 7.7 21.5 11.6 19.5 16.4 12 21 12 21z"
      />
    </svg>
  );
}

function CrownSvg({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 8l3 4 3-6 3 6 3-6 3 6 3-4-2 11H5L3 8z"
      />
    </svg>
  );
}
