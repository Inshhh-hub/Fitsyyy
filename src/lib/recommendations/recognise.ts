import type { FashionCategory } from "@/types";
import { anchorTypesFor } from "./anchor";

/**
 * Turns the AI's plain-English description of a garment ("ITEM: black baggy pants") into one of our
 * clothing types and colours. The model only describes; this table decides, so a wrong or odd answer
 * can never produce something we don't support.
 */
const TYPE_RULES: Array<[RegExp, string]> = [
  // footwear
  [/jutti|juti\b|mojari|kolhapuri/, "juttis"],
  [/running|training|gym shoe|sports? shoe|athletic shoe/, "training-shoes"],
  [/chunky|platform sneaker|dad (shoe|sneaker)/, "chunky-sneakers"],
  [/canvas|slip[- ]?on|espadrille/, "canvas"],
  [/sneaker|trainer|kicks/, "white-sneakers"],
  [/loafer|moccasin|boat shoe/, "loafers"],
  [/oxford shoe|derby|brogue|formal shoe|dress shoe|monk strap/, "formal-shoes"],
  [/boot/, "boots"],
  [/heel|pump|stiletto|wedge/, "heels"],
  [/ballet|ballerina|\bflats?\b/, "flats"],
  [/sandal|slide|flip[- ]?flop|slipper|chappal|floater/, "slides"],
  // layers
  [/denim jacket|jean jacket|trucker jacket/, "denim-jacket"],
  [/leather jacket|biker|faux leather/, "leather-jacket"],
  [/puffer|quilted|down jacket/, "puffer"],
  [/track jacket|windcheater|windbreaker/, "track-jacket"],
  [/blazer|suit jacket|sport coat/, "blazer"],
  [/trench|overcoat|long coat/, "coat"],
  [/nehru|bandhgala|waistcoat|ethnic jacket|\bkoti\b/, "ethnic-jacket"],
  [/overshirt|shacket|shirt jacket/, "overshirt"],
  [/cardigan|shrug/, "cardigan"],
  [/bomber|jacket|\bcoat\b/, "jacket"],
  // bottomwear
  [/palazzo|salwar|pyjama|pajama|dhoti|churidar|patiala/, "ethnic-bottom"],
  [/legging|jegging/, "leggings"],
  [/jogger|track ?pants?|sweatpant|lowers/, "joggers"],
  [/\bskirt/, "skirt"],
  [/\bshorts\b/, "shorts"],
  [/cargo|parachute|carpenter/, "cargo"],
  [/pleated/, "pleated"],
  [/chino/, "chinos"],
  [/wide[- ]?leg(?!.*(jean|denim))/, "wide-leg"],
  [/(baggy|loose|relaxed|oversized|wide[- ]?leg).*(jean|denim|pant|trouser)|(jean|denim|pant|trouser).*(baggy|loose|wide[- ]?leg)/, "baggy"],
  [/formal (trouser|pant)|dress pant|suit (trouser|pant)|trouser/, "trousers"],
  [/skinny|slim.*(jean|denim|pant)|(jean|denim).*slim/, "slim-jeans"],
  [/jean|denim (pant|trouser)|denims/, "straight-jeans"],
  [/\bpants?\b/, "chinos"],
  // upperwear
  [/hoodie|sweatshirt|pullover|crew ?neck sweat/, "hoodie"],
  [/sweater|jumper|knit(ted)? top|knitwear/, "sweater"],
  [/polo/, "polo"],
  [/kurta|kurti|tunic|sherwani/, "kurta"],
  [/resort|camp collar|cuban|hawaiian|printed shirt|floral shirt|patterned shirt/, "resort-shirt"],
  [/flannel|plaid|check(ed)? shirt/, "flannel"],
  [/linen shirt/, "linen-shirt"],
  [/formal shirt|dress shirt|oxford shirt|office shirt/, "formal-shirt"],
  [/henley|(full|long)[- ]sleeve(d)? (t-?shirt|tee)/, "henley"],
  [/crop(ped)? (top|tee)|baby tee|bralette/, "crop-top"],
  [/tank|sleeveless|singlet|gym (tee|shirt)|sports? (tee|shirt)|dri-?fit/, "gym-tee"],
  [/(oversized|boxy|graphic|printed|band|drop[- ]shoulder).*(t-?shirt|tee)|(t-?shirt|tee).*(oversized|boxy|graphic)/, "oversized-tee"],
  [/t-?shirt|\btees?\b/, "tee"],
  [/blouse|camisole|\bcami\b|\btops?\b/, "top"],
  [/shirt/, "shirt"],
];

const COLOUR_RULES: Array<[RegExp, string]> = [
  [/light blue|sky blue|baby blue|powder blue|pale blue/, "lightblue"],
  [/navy|midnight|dark blue|royal blue/, "navy"],
  [/off[- ]?white|cream|ecru|bone/, "cream"],
  [/ivory/, "ivory"],
  [/white/, "white"],
  [/charcoal|dark gr[ae]y|graphite|anthracite/, "charcoal"],
  [/black|jet/, "black"],
  [/gr[ae]y|silver|slate|ash/, "grey"],
  [/beige|sand|nude|stone|oatmeal/, "beige"],
  [/camel/, "camel"],
  [/khaki/, "khaki"],
  [/tan\b|caramel/, "tan"],
  [/brown|chocolate|coffee|mocha|chestnut/, "brown"],
  [/sage|mint|light green|pistachio|pale green/, "sage"],
  [/emerald|bottle green|forest|dark green/, "emerald"],
  [/olive|army|military|moss/, "olive"],
  [/green/, "olive"],
  [/maroon|oxblood/, "maroon"],
  [/burgundy|wine|plum/, "burgundy"],
  [/red/, "red"],
  [/peach|coral|salmon/, "peach"],
  [/pink|rose|blush|fuchsia|magenta/, "pink"],
  [/rust|terracotta|brick|orange/, "rust"],
  [/mustard|yellow|ochre/, "mustard"],
  [/gold/, "gold"],
  [/teal|turquoise|aqua|cyan/, "teal"],
  [/lavender|lilac|violet|purple/, "lavender"],
  [/denim|indigo|washed blue/, "denim"],
  [/blue/, "blue"],
];

export function colourFromText(text: string): string | undefined {
  const t = text.toLowerCase();
  for (const [re, name] of COLOUR_RULES) if (re.test(t)) return name;
  return undefined;
}

export interface Recognised {
  typeId?: string;
  colour?: string;
  /** what the model said, shown to the shopper ("black baggy pants") */
  seen: string;
}

export function parseRecognition(reply: string, category: FashionCategory): Recognised {
  const field = (name: string) => reply.match(new RegExp(`${name}\\s*[:\\-]\\s*([^\\n]+)`, "i"))?.[1]?.trim() ?? "";
  const item = (field("ITEM") || reply).slice(0, 120);
  const fit = field("FIT").toLowerCase();
  const colourText = field("COLOUR") || field("COLOR");

  // Fit only matters when it changes the type (baggy/oversized/slim), not for "regular" or "relaxed".
  const fitWord = /baggy|loose|wide|oversized|boxy|slim|skinny/.exec(fit)?.[0] ?? "";
  const text = `${item} ${fitWord}`.toLowerCase();
  const allowed = new Set(anchorTypesFor(category).map((a) => a.id));

  let typeId: string | undefined;
  for (const [re, id] of TYPE_RULES) {
    if (re.test(text) && allowed.has(id)) {
      typeId = id;
      break;
    }
  }

  let colour = colourFromText(colourText) ?? colourFromText(item);
  // Jeans that read as "blue" are the denim shade in our palette.
  if (colour === "blue" && /jean|denim/.test(text)) colour = "denim";
  return { typeId, colour, seen: item.replace(/\s+/g, " ").trim() };
}
