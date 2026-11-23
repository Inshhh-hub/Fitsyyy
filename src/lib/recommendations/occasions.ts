export type OccasionGroup = "casual" | "formal" | "party" | "ethnic" | "sport";
export type ConceptSetId = "wedding" | "formal" | "party" | "date" | "casual" | "festival" | "gym";

export interface Occasion {
  id: string;
  label: string;
  group: OccasionGroup;
  conceptSet: ConceptSetId;
  blurb: string;
  /** lucide-react icon name, resolved in the UI */
  icon: "Music" | "Heart" | "PartyPopper" | "Coffee" | "Briefcase" | "Building2" | "Dumbbell" | "Users" | "Wine" | "GraduationCap" | "Sparkles" | "Plus";
  /** Tailwind classes for the illustrated card background */
  tone: string;
}

export const OCCASIONS: Occasion[] = [
  { id: "clubbing", label: "Clubbing", group: "party", conceptSet: "party", blurb: "After-dark, high-energy looks", icon: "Music", tone: "from-charcoal to-charcoal-soft text-ivory" },
  { id: "wedding", label: "Wedding", group: "ethnic", conceptSet: "wedding", blurb: "Ceremony to reception", icon: "Heart", tone: "from-beige-deep to-beige text-charcoal" },
  { id: "birthday", label: "Birthday Party", group: "party", conceptSet: "party", blurb: "Celebrate with a little shine", icon: "PartyPopper", tone: "from-sage-light to-beige text-charcoal" },
  { id: "casual", label: "Casual Outing", group: "casual", conceptSet: "casual", blurb: "Cafés, malls and weekends", icon: "Coffee", tone: "from-beige to-ivory text-charcoal" },
  { id: "interview", label: "Job Interview", group: "formal", conceptSet: "formal", blurb: "Confident and credible", icon: "Briefcase", tone: "from-taupe to-taupe-dark text-ivory" },
  { id: "office", label: "Office / Formal", group: "formal", conceptSet: "formal", blurb: "Everyday professional polish", icon: "Building2", tone: "from-beige-deep to-taupe text-charcoal" },
  { id: "gym", label: "Sports / Gym", group: "sport", conceptSet: "gym", blurb: "Built to move", icon: "Dumbbell", tone: "from-sage to-sage-dark text-ivory" },
  { id: "family", label: "Family Gathering", group: "casual", conceptSet: "casual", blurb: "Comfortable but put-together", icon: "Users", tone: "from-ivory to-beige text-charcoal" },
  { id: "date", label: "Date Night", group: "party", conceptSet: "date", blurb: "Easy, memorable, a little polished", icon: "Wine", tone: "from-charcoal-soft to-taupe-dark text-ivory" },
  { id: "college", label: "College / University", group: "casual", conceptSet: "casual", blurb: "Campus-ready comfort", icon: "GraduationCap", tone: "from-sage-light to-ivory text-charcoal" },
  { id: "festival", label: "Festival / Traditional Event", group: "ethnic", conceptSet: "festival", blurb: "Festive and rooted", icon: "Sparkles", tone: "from-beige to-beige-deep text-charcoal" },
  { id: "others", label: "Others", group: "casual", conceptSet: "casual", blurb: "Tell us what you're dressing for", icon: "Plus", tone: "from-ivory to-sage-light text-charcoal" },
];

export function getOccasion(id: string): Occasion {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[3];
}

/** Best-effort mapping of a free-text "Others" occasion onto a known styling group. */
export function inferOccasionFromText(text: string): Occasion {
  const t = text.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/wedding|sangeet|mehendi|mehndi|reception|haldi|engagement/, "wedding"],
    [/diwali|eid|puja|pooja|navratri|garba|festival|onam|pongal|temple|traditional/, "festival"],
    [/interview|office|meeting|presentation|conference|formal|business/, "office"],
    [/gym|run|sport|yoga|workout|training|cricket|football/, "gym"],
    [/club|party|pub|bar|night out|concert/, "clubbing"],
    [/date|dinner|anniversary/, "date"],
  ];
  for (const [re, id] of rules) if (re.test(t)) return getOccasion(id);
  return getOccasion("others");
}
