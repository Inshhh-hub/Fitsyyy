"use client";

import type { Outfit, Slot } from "@/types";
import { Badge, Modal } from "@/components/ui/primitives";
import { SLOT_LABEL } from "@/lib/recommendations/budget";
import { formatINR } from "@/lib/utils";
import { OutfitImages } from "./OutfitImages";

const ORDER: Slot[] = ["upper", "outer", "lower", "footwear", "watch", "belt", "eyewear", "bag", "wallet", "bracelet", "chain", "cap"];

export function CompareModal({ outfits, onClose, onRemove }: { outfits: Outfit[]; onClose: () => void; onRemove: (id: string) => void }) {
  const slots = ORDER.filter((s) => outfits.some((o) => o.items.some((i) => i.slot === s)));
  return (
    <Modal open={outfits.length > 0} onClose={onClose} title="Compare outfits" wide>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr>
              <th className="w-28" />
              {outfits.map((o) => (
                <th key={o.id} className="px-2 pb-3 align-top">
                  <OutfitImages items={o.items} compact className="mx-auto h-40 w-40" />
                  <p className="mt-2 font-serif text-lg leading-tight">{o.name}</p>
                  <p className="text-xs font-normal text-taupe">{o.occasionLabel}</p>
                  <button onClick={() => onRemove(o.id)} className="mt-1 text-xs font-normal text-taupe underline">Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-t border-beige-deep"><td className="py-2 text-xs text-taupe">Match score</td>{outfits.map((o) => <td key={o.id} className="px-2 py-2 font-medium">{o.suitabilityScore}/100</td>)}</tr>
            <tr className="border-t border-beige-deep"><td className="py-2 text-xs text-taupe">Colour fit</td>{outfits.map((o) => <td key={o.id} className="px-2 py-2">{o.scores.colour}</td>)}</tr>
            {slots.map((s) => (
              <tr key={s} className="border-t border-beige-deep">
                <td className="py-2 text-xs text-taupe">{SLOT_LABEL[s]}</td>
                {outfits.map((o) => {
                  const it = o.items.find((i) => i.slot === s);
                  return <td key={o.id} className="px-2 py-2">{it ? <><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border border-charcoal/20" style={{ background: it.hex }} />{it.name}<span className="block text-xs text-taupe">{formatINR(it.price)}</span></> : <span className="text-taupe">—</span>}</td>;
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-charcoal"><td className="py-3 text-xs text-taupe">Total</td>{outfits.map((o) => <td key={o.id} className="px-2 py-3 font-serif text-xl">{formatINR(o.total)}</td>)}</tr>
            <tr><td className="py-1 text-xs text-taupe">Budget</td>{outfits.map((o) => <td key={o.id} className="px-2 py-1">{o.withinBudget ? <Badge tone="sage">{formatINR(o.budget - o.total)} left</Badge> : <Badge tone="warn">{formatINR(o.total - o.budget)} over</Badge>}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
