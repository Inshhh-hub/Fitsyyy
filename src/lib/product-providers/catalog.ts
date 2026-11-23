import type { FashionCategory, Product, Slot, Tier } from "@/types";
import { hexFor } from "@/lib/recommendations/colour";

/**
 * SAMPLE catalogue used only in demo mode. These are NOT real listings:
 * no product URLs, no images, no stock status. The UI labels every item as "Sample".
 * Row format: slot | subtype | name | price(INR) | colour | gender(m/w/u) | groups(c,f,p,e,s) | tags | tier(b/m/p)
 */
const ROWS = `
upper|T-shirt|Plain Cotton Crew Tee|449|white|u|cs|minimal,value,comfy,monochrome|b
upper|T-shirt|Heavyweight Boxy Tee|899|black|u|cp|street,oversized,minimal,monochrome|b
upper|T-shirt|Graphic Oversized Tee|799|charcoal|u|cp|street,oversized,statement|b
upper|T-shirt|Striped Breton Tee|699|navy|u|c|classic,smartcasual|b
upper|Polo|Pique Polo Shirt|1199|navy|m|cs|smartcasual,classic,sporty|m
upper|Polo|Textured Knit Polo|1799|olive|m|cp|smartcasual,earth,premium|m
upper|Shirt|Linen Blend Casual Shirt|1399|beige|m|c|smartcasual,earth,minimal|m
upper|Shirt|Oxford Button-Down Shirt|1599|lightblue|m|cf|classic,smartcasual,semiformal|m
upper|Shirt|Printed Resort Shirt|1199|teal|m|cp|statement,street|b
upper|Shirt|Washed Denim Shirt|1699|denim|m|c|street,smartcasual|m
upper|Hoodie|Zip Hoodie|1499|grey|u|c|comfy,street,value|m
upper|Sweater|Merino Blend Crew Sweater|2999|camel|u|cpf|premium,classic,earth,date,luxe|p
upper|Shirt|Satin Finish Party Shirt|1799|burgundy|m|p|party,statement,date|m
upper|Shirt|Mandarin Collar Black Shirt|1599|black|m|p|party,minimal,monochrome,date|m
upper|Shirt|Cuban Collar Shirt|1299|rust|m|pc|statement,party,earth|b
upper|Top|Ribbed Fitted Top|699|cream|w|cp|minimal,smartcasual,date|b
upper|Top|Satin Cami Top|999|burgundy|w|p|party,date,statement|b
upper|Top|Off-Shoulder Top|1099|black|w|p|party,date,monochrome|b
upper|Shirt|Relaxed Poplin Shirt|1299|white|w|cf|classic,minimal,smartcasual|m
upper|Shirt|Tailored Work Shirt|1599|lightblue|w|f|formal,classic|m
upper|Top|Knit Sweater Top|1599|sage|w|c|comfy,minimal,earth|m
upper|Kurti|Cotton Printed Kurti|899|mustard|w|ce|traditional,festive,value|b
upper|Kurta|Chikankari Kurta|2199|ivory|w|e|traditional,classic,wedding,festive|m
upper|Kurta|Embroidered Anarkali Kurta|3499|maroon|w|e|traditional,wedding,statement,premium|m
upper|Kurta|Silk Blend Short Kurta|2599|emerald|w|e|indowestern,festive,wedding|m
upper|Kurta|Cotton Straight Kurta|1199|teal|w|ce|minimal,traditional,value|b
upper|Top|Sports Crop Top|799|black|w|s|sporty,monochrome|b
upper|Blouse|Tailored Blouse|1499|blue|w|f|formal,semiformal|m
upper|Kurta|Cotton Straight Kurta|1299|ivory|m|e|traditional,classic,festive,value|b
upper|Kurta|Silk Blend Kurta|2999|maroon|m|e|traditional,wedding,statement,premium|m
upper|Kurta|Short Kurta Indo-Western|1999|olive|m|e|indowestern,festive,minimal|m
upper|Kurta|Embroidered Sherwani Kurta|5999|cream|m|e|wedding,luxe,premium,traditional,minimal|p
upper|Kurta|Printed Festive Kurta|1599|rust|m|e|festive,statement,traditional|b
upper|Shirt|Formal Cotton Shirt|1199|white|m|f|formal,classic,minimal,value|b
upper|Shirt|Slim Fit Check Shirt|1399|lightblue|m|f|formal,semiformal,classic|b
upper|Shirt|Textured Formal Shirt|1699|grey|m|f|formal,minimal,premium|m
upper|Shirt|Pink Formal Shirt|1399|pink|m|f|semiformal,smartcasual|b
upper|Shirt|Premium Twill Shirt|2999|navy|m|f|formal,premium,luxe|p
upper|T-shirt|Dry-Fit Training Tee|599|black|u|s|sporty,value,monochrome|b
upper|T-shirt|Performance Tee|999|teal|u|s|sporty,statement|m
upper|T-shirt|Compression Tee|1299|charcoal|u|s|sporty,premium|m
upper|Tank|Gym Tank|499|grey|u|s|sporty,value|b
outer|Blazer|Notch Lapel Blazer|3999|navy|m|f|formal,classic,semiformal,premium|m
outer|Blazer|Textured Unstructured Blazer|3499|beige|m|fcp|smartcasual,semiformal,earth,minimal|m
outer|Blazer|Charcoal Slim Blazer|4499|charcoal|m|f|formal,premium,minimal|p
outer|Blazer|Velvet Evening Blazer|5499|burgundy|m|p|party,statement,luxe,premium|p
outer|Blazer|Tailored Blazer|3999|black|w|fp|formal,minimal,classic,premium|m
outer|Blazer|Linen Blend Blazer|3299|beige|w|fc|smartcasual,earth,minimal|m
outer|Jacket|Bomber Jacket|2499|olive|u|cp|street,earth|m
outer|Jacket|Denim Jacket|2299|denim|u|cp|street,classic|m
outer|Jacket|Faux Leather Biker Jacket|3499|black|u|p|party,statement,street,premium|m
outer|Jacket|Overshirt Jacket|1999|khaki|m|c|earth,smartcasual,minimal|m
outer|Jacket|Nehru Jacket|2499|navy|m|e|traditional,indowestern,wedding,classic|m
outer|Jacket|Brocade Nehru Jacket|3499|gold|m|e|wedding,festive,statement,traditional,premium|m
outer|Jacket|Indo-Western Mandarin Jacket|3999|emerald|m|e|indowestern,wedding,statement,premium|m
outer|Dupatta|Chanderi Dupatta|1299|gold|w|e|traditional,wedding,festive|b
outer|Dupatta|Silk Dupatta|1899|maroon|w|e|traditional,wedding,statement,premium|m
outer|Shrug|Longline Shrug|1599|cream|w|cpe|indowestern,minimal|b
outer|Jacket|Track Jacket|1499|black|u|s|sporty,comfy|b
lower|Jeans|Slim Fit Dark Jeans|1499|navy|m|cp|classic,smartcasual,date|b
lower|Jeans|Washed Straight Jeans|1699|denim|u|cp|street,classic|b
lower|Jeans|Baggy Wide-Leg Jeans|1999|black|u|cp|street,oversized,statement|m
lower|Jeans|High-Rise Straight Jeans|1799|denim|w|cp|classic,minimal,smartcasual|m
lower|Chinos|Stretch Chinos|1399|beige|m|cf|smartcasual,minimal,earth|b
lower|Chinos|Tapered Chinos|1599|olive|m|c|earth,smartcasual|b
lower|Trousers|Cream Pleated Trousers|1899|cream|u|cp|minimal,date,premium|m
lower|Cargo|Utility Cargo Pants|1799|khaki|u|c|street,earth|m
lower|Cargo|Relaxed Cargo Pants|1699|black|u|cp|street,monochrome,oversized|m
lower|Trousers|Slim Formal Trousers|1499|charcoal|m|f|formal,classic,minimal|b
lower|Trousers|Pleated Formal Trousers|1799|navy|m|f|formal,classic,semiformal|m
lower|Trousers|Wool Blend Trousers|2999|grey|m|f|formal,premium,luxe|p
lower|Trousers|Tailored Black Trousers|1899|black|m|fp|formal,minimal,party,monochrome|m
lower|Trousers|Straight Cut Trousers|1599|black|w|fp|formal,minimal,classic,monochrome|b
lower|Trousers|Wide-Leg Trousers|1999|beige|w|fcp|smartcasual,minimal,earth|m
lower|Trousers|Tailored Ankle Trousers|1799|navy|w|f|formal,semiformal|m
lower|Skirt|Satin Midi Skirt|1499|sage|w|pc|date,party,minimal|m
lower|Skirt|Pleated Midi Skirt|1599|black|w|cp|classic,date,monochrome|m
lower|Palazzo|Cotton Palazzo|899|ivory|w|ec|traditional,value,minimal|b
lower|Sharara|Silk Blend Sharara|2499|maroon|w|e|wedding,traditional,statement|m
lower|Palazzo|Straight Ethnic Pants|1199|mustard|w|e|indowestern,festive|b
lower|Pyjama|Cotton Churidar|899|ivory|m|e|traditional,classic,value|b
lower|Pyjama|Silk Blend Churidar|1499|cream|m|e|wedding,traditional,minimal|b
lower|Trousers|Ethnic Straight Pants|1399|beige|m|e|indowestern,minimal|b
lower|Dhoti|Dhoti Pants|1999|cream|m|e|indowestern,festive,statement|m
lower|Shorts|Cotton Chino Shorts|999|khaki|m|c|smartcasual,comfy|b
lower|Shorts|Training Shorts|699|black|u|s|sporty,value,monochrome|b
lower|Joggers|Tapered Track Pants|999|charcoal|u|s|sporty,comfy|b
lower|Leggings|High-Waist Leggings|1099|black|w|s|sporty,monochrome|b
lower|Joggers|Performance Joggers|1699|navy|u|s|sporty,premium|m
lower|Shorts|Biker Shorts|799|grey|w|s|sporty,value|b
footwear|Sneakers|Minimal White Sneakers|1499|white|u|cp|minimal,classic,smartcasual|b
footwear|Sneakers|Chunky Street Sneakers|2499|grey|u|cp|street,statement|m
footwear|Sneakers|Retro Canvas Sneakers|1199|black|u|c|street,value,classic|b
footwear|Sneakers|Premium Leather Sneakers|3999|white|u|cpf|premium,minimal,luxe|m
footwear|Loafers|Suede Loafers|2299|tan|m|cf|smartcasual,classic,earth|m
footwear|Loafers|Leather Penny Loafers|2799|brown|m|f|formal,classic|m
footwear|Formal Shoes|Leather Derby Shoes|2499|black|m|f|formal,classic|m
footwear|Formal Shoes|Oxford Brogues|3499|brown|m|f|formal,premium,classic|m
footwear|Formal Shoes|Formal Slip-ons|999|black|m|f|formal,value|b
footwear|Boots|Chelsea Boots|3299|black|u|pc|party,statement,street,premium|m
footwear|Boots|Suede Desert Boots|2799|tan|m|cp|earth,smartcasual|m
footwear|Sandals|Leather Kolhapuri Sandals|1199|tan|u|ec|traditional,festive,value|b
footwear|Ethnic Footwear|Embroidered Mojari|1499|gold|m|e|wedding,traditional,festive|b
footwear|Ethnic Footwear|Velvet Mojari|2299|maroon|m|e|wedding,statement,traditional,premium|m
footwear|Ethnic Footwear|Embroidered Juttis|1299|mustard|w|e|traditional,festive,value|b
footwear|Ethnic Footwear|Zari Juttis|1899|gold|w|e|wedding,statement,traditional|m
footwear|Heels|Block Heels|1999|black|w|fp|formal,classic,party|m
footwear|Heels|Strappy Heels|2299|gold|w|pe|party,wedding,statement|m
footwear|Flats|Ballet Flats|1199|cream|w|cf|minimal,classic,value|b
footwear|Loafers|Women's Loafers|1799|black|w|fc|formal,minimal,smartcasual|m
footwear|Sports Shoes|Running Shoes|2499|black|u|s|sporty,premium|m
footwear|Sports Shoes|Cushioned Trainers|3999|white|u|s|sporty,premium|m
footwear|Sports Shoes|Training Shoes|1299|grey|u|s|sporty,value|b
footwear|Sandals|Comfort Slides|699|black|u|c|comfy,value|b
watch|Watch|Minimal Analog Watch|1999|silver|u|cfp|minimal,classic,date|m
watch|Watch|Leather Strap Watch|2999|brown|m|cf|classic,formal,premium|m
watch|Watch|Digital Sports Watch|1299|black|u|s|sporty,value|b
watch|Watch|Rose-Tone Dress Watch|2499|gold|w|fpe|classic,premium,wedding|m
watch|Watch|Everyday Analog Watch|699|black|u|cf|value,minimal|b
belt|Belt|Leather Formal Belt|799|brown|m|f|formal,classic|b
belt|Belt|Black Leather Belt|799|black|m|fp|formal,classic,monochrome|b
belt|Belt|Canvas Casual Belt|499|olive|u|c|smartcasual,value|b
belt|Belt|Slim Waist Belt|699|tan|w|fc|minimal,classic|b
eyewear|Sunglasses|Wayfarer Sunglasses|999|black|u|cp|classic,street|b
eyewear|Sunglasses|Round Metal Sunglasses|1499|gold|u|cp|minimal,statement|m
eyewear|Sunglasses|Aviator Sunglasses|1799|silver|u|c|classic,premium|m
bag|Backpack|Everyday Backpack|1299|charcoal|u|cs|comfy,value|b
bag|Tote|Canvas Tote Bag|899|beige|u|c|minimal,value|b
bag|Laptop Bag|Structured Work Bag|2499|black|u|f|formal,classic|m
bag|Clutch|Embellished Clutch|1299|gold|w|pe|party,wedding,statement|b
bag|Sling|Crossbody Sling Bag|1499|black|u|cp|street,minimal|b
bag|Gym Bag|Duffle Gym Bag|1199|charcoal|u|s|sporty,value|b
wallet|Wallet|Slim Leather Wallet|899|brown|m|fc|classic,minimal|b
bracelet|Bracelet|Beaded Bracelet|499|tan|u|c|street,earth,value|b
bracelet|Bracelet|Steel Cuff Bracelet|999|silver|u|cp|minimal,statement|b
bracelet|Bangles|Glass Bangle Set|699|maroon|w|e|traditional,festive,wedding|b
bracelet|Bangles|Kundan Bangle Set|1999|gold|w|e|wedding,statement,traditional|m
chain|Chain|Silver Chain|899|silver|u|pc|street,minimal,party|b
chain|Chain|Layered Necklace|1299|gold|w|pc|date,party,minimal|b
chain|Necklace|Kundan Necklace|2499|gold|w|e|wedding,statement,traditional|m
cap|Cap|Baseball Cap|599|black|u|cs|street,sporty,value|b
upper|T-shirt|Acid Wash Oversized Tee|899|grey|u|cp|street,oversized,statement|b
upper|T-shirt|Vintage Band Tee|999|black|u|cp|street,oversized,statement|b
upper|T-shirt|Boxy Pocket Tee|699|olive|u|c|street,minimal,earth|b
upper|T-shirt|Boxy Pocket Tee|699|beige|u|c|street,minimal,earth|b
upper|T-shirt|Baby Tee|599|white|w|cp|street,date,minimal|b
upper|T-shirt|Cropped Boxy Tee|649|black|w|cp|street,oversized|b
upper|Top|Corset Style Top|1199|black|w|p|party,date,statement|m
upper|Top|Halter Neck Top|899|white|w|p|party,date,minimal|b
upper|Shirt|Oversized Striped Shirt|1299|lightblue|u|c|street,oversized,smartcasual|b
upper|Shirt|Linen Camp Collar Shirt|1499|cream|m|cp|smartcasual,date,minimal,earth|b
upper|Shirt|Printed Resort Shirt|1399|black|m|cp|statement,date,street|b
upper|Shirt|Printed Resort Shirt|1399|navy|m|cp|statement,date,smartcasual|b
upper|Sweatshirt|Oversized Crewneck Sweatshirt|1299|beige|u|c|comfy,oversized,street|b
upper|Hoodie|Oversized Pullover Hoodie|1499|black|u|cp|street,oversized,comfy,monochrome|m
upper|Hoodie|Oversized Pullover Hoodie|1499|charcoal|u|cp|street,oversized,comfy|m
upper|Jersey|Retro Football Jersey|1199|navy|u|cp|street,sporty,statement|b
upper|T-shirt|Plain Cotton Crew Tee|449|black|u|cs|minimal,value,comfy,monochrome|b
upper|T-shirt|Vintage Graphic Tee|849|white|u|cp|street,oversized,statement|b
outer|Jacket|Varsity Jacket|2299|maroon|u|cp|street,statement|m
outer|Jacket|Utility Chore Jacket|1899|olive|u|c|earth,street,smartcasual|m
outer|Jacket|Trench Coat|3999|beige|u|cf|classic,premium,luxe|p
outer|Jacket|Puffer Jacket|2799|black|u|cp|street,comfy,premium|m
lower|Jeans|Baggy Light-Wash Jeans|1999|denim|u|c|street,oversized|b
lower|Jeans|Ripped Straight Jeans|1799|lightblue|u|cp|street,smartcasual|b
lower|Jeans|Wide-Leg Light Jeans|1899|lightblue|w|cp|street,date,minimal|b
lower|Jeans|Washed Black Carpenter Jeans|1999|black|u|cp|street,oversized|m
lower|Cargo|Parachute Pants|1699|olive|u|cp|street,oversized|b
lower|Cargo|Parachute Pants|1699|black|u|cp|street,oversized,monochrome|b
lower|Trousers|Pleated Wide Trousers|1799|black|u|pcf|classic,street,smartcasual,monochrome|m
lower|Skirt|Pleated Mini Skirt|899|black|w|cp|street,party|b
lower|Skirt|Denim Mini Skirt|999|denim|w|cp|street,date|b
lower|Pants|Straight Track Pants|1299|black|u|cs|comfy,street,sporty|b
lower|Shorts|Baggy Denim Jorts|1499|denim|m|c|street,oversized|b
lower|Trousers|Wide-Leg Trousers|1599|cream|w|cf|minimal,date,classic|m
footwear|Sneakers|Chunky Dad Sneakers|1999|white|u|cp|street,oversized,statement|b
footwear|Sneakers|Retro Low-Top Sneakers|1799|cream|u|c|street,classic,minimal|b
footwear|Sneakers|High-Top Canvas Sneakers|1599|white|u|c|street,value|b
footwear|Sneakers|Terrace Style Trainers|2199|white|u|cp|street,classic|m
footwear|Boots|Combat Boots|2999|black|u|p|street,statement|m
footwear|Sandals|Platform Sandals|1499|black|w|cp|street,party|b
cap|Beanie|Knit Beanie|449|black|u|c|street,comfy,value|b
cap|Cap|Trucker Cap|549|white|u|c|street,value|b
eyewear|Sunglasses|Rectangle Sunglasses|799|black|u|cp|street,minimal|b
bag|Bag|Mini Shoulder Bag|1299|black|w|cp|street,minimal|b
bag|Bag|Messenger Bag|1599|black|u|c|street,classic|b
chain|Chain|Chunky Chain|1099|silver|u|cp|street,statement|b
chain|Necklace|Pearl Necklace|899|white|w|pc|date,minimal,classic|b
earrings|Earrings|Pearl Drop Earrings|499|white|w|cpf|minimal,date,classic|b
earrings|Earrings|Gold-Tone Hoop Earrings|599|gold|w|cp|minimal,party,date|b
earrings|Earrings|Oxidised Silver Jhumkas|699|silver|w|ce|traditional,street,festive|b
earrings|Earrings|Kundan Jhumka Earrings|1499|gold|w|e|wedding,traditional,statement|m
earrings|Earrings|Crystal Stud Earrings|799|silver|w|pf|party,minimal,date|b
ring|Ring|Plain Steel Band Ring|399|silver|u|cp|minimal,street,value|b
ring|Ring|Stackable Gold-Tone Rings|699|gold|w|cpe|minimal,date,party|b
ring|Ring|Signet Ring|999|silver|m|cp|street,classic,statement|b
scarf|Scarf|Cotton Printed Scarf|599|beige|u|c|earth,smartcasual,comfy|b
scarf|Stole|Soft Wool Stole|1299|camel|u|cef|premium,classic,earth|m
scarf|Dupatta|Chanderi Dupatta|1499|maroon|w|e|traditional,festive,wedding|m
tie|Tie|Slim Navy Tie|699|navy|m|f|formal,classic|b
tie|Tie|Textured Burgundy Tie|899|burgundy|m|fp|formal,statement,classic|b
tie|Tie|Charcoal Knit Tie|799|charcoal|m|f|formal,minimal,semiformal|b
socks|Socks|Cotton Ankle Socks (Pack of 3)|349|white|u|cs|value,sporty,comfy|b
socks|Socks|Cushioned Sport Socks|499|black|u|s|sporty,value|b
socks|Socks|Patterned Crew Socks|399|navy|u|cp|street,statement,value|b
socks|Socks|Formal Dress Socks|449|charcoal|m|f|formal,classic|b
cap|Cap|Dad Cap|599|beige|u|c|minimal,value|b
`;

const G: Record<string, FashionCategory> = { m: "men", w: "women", u: "unisex" };
const GRP: Record<string, string> = { c: "casual", f: "formal", p: "party", e: "ethnic", s: "sport" };
const TIER: Record<string, Tier> = { b: "budget", m: "mid", p: "premium" };

export const DEMO_CATALOG: Product[] = ROWS.trim()
  .split("\n")
  .map((line, i) => {
    const [slot, subtype, name, price, colour, g, groups, tags, tier] = line.split("|");
    return {
      id: `demo-${String(i + 1).padStart(3, "0")}`,
      name,
      brand: "Sample",
      merchant: "Sample data",
      slot: slot as Slot,
      subtype,
      price: Number(price),
      colour,
      hex: hexFor(colour),
      gender: G[g],
      groups: groups.split("").map((ch) => GRP[ch]),
      tags: tags.split(","),
      tier: TIER[tier],
      isSample: true,
    } satisfies Product;
  });
