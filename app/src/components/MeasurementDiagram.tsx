"use client";
import Image from "next/image";
// Visual "how to measure" guide. Shows the reference diagram for the garment
// family, picked from the operator's free-text garment type.

type Family = "top" | "dress" | "pants" | "skirt";

// Map the operator's free-text garment type to a diagram family.
export function garmentFamily(garmentType?: string): Family {
  const t = (garmentType ?? "").toLowerCase();
  if (/\bskirt|skort/.test(t)) return "skirt";
  if (/\bpant|jean|trouser|short|legging|culotte|slack|chino|capri|cargo|overall/.test(t)) return "pants";
  if (/\bdress|gown|frock|jumpsuit|romper|caftan|kaftan|sundress|nightgown/.test(t)) return "dress";
  return "top";
}

type Diagram = { src: string; w: number; h: number; alt: string };

const BY_FAMILY: Record<Exclude<Family, "skirt">, Diagram> = {
  top: { src: "/measure/top.jpg", w: 1354, h: 1354, alt: "Top measurement points: shoulder, chest, sleeve, length" },
  dress: { src: "/measure/dress.jpg", w: 1312, h: 1320, alt: "Dress measurement points: bust, waist, hip, length" },
  pants: { src: "/measure/pants.jpg", w: 1356, h: 2160, alt: "Pants measurement points: waist, rise, inseam, leg opening" },
};

const SKIRT_GATHERED: Diagram = { src: "/measure/skirt.jpg", w: 1356, h: 1358, alt: "Skirt measurement points: waist, hip, length, hem opening" };
const SKIRT_PENCIL: Diagram = { src: "/measure/skirt-pencil.jpg", w: 1350, h: 1674, alt: "Pencil skirt measurement points: waist, hip, length, width" };

function pickDiagram(garmentType?: string): Diagram {
  const family = garmentFamily(garmentType);
  if (family === "skirt") {
    return /pencil|straight|pegged|tube/.test((garmentType ?? "").toLowerCase()) ? SKIRT_PENCIL : SKIRT_GATHERED;
  }
  return BY_FAMILY[family];
}

export function MeasurementDiagram({ garmentType }: { garmentType?: string }) {
  const d = pickDiagram(garmentType);
  return (
    <div className="mb-4 rounded-2xl border-2 border-ink bg-paper p-3 shadow-[4px_4px_0_rgba(59,42,24,0.18)]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        How to measure · lay flat, measure straight across
      </p>
      <Image
        src={d.src}
        alt={d.alt}
        width={d.w}
        height={d.h}
        className="mx-auto h-auto w-full max-w-[320px]"
      />
      <p className="mt-2 text-[12px] leading-snug text-ink">
        Widths (pit-to-pit, waist, hips) get <b className="text-pumpkin">doubled</b> for the listing.
      </p>
    </div>
  );
}
