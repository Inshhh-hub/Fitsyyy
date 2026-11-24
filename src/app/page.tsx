import { ArrowRight, Camera, Palette, Ruler, Shirt, ShieldCheck, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { HeroModels } from "@/components/outfit-cards/HeroModels";

const STEPS = [
  { icon: Wallet, title: "Set your budget first", body: "Tell us what the whole outfit should cost, in rupees. Every look is built to stay inside it." },
  { icon: Camera, title: "Analyse your colouring", body: "A quick selfie is analysed on your device for face shape, skin tone and undertone. Or just enter them yourself." },
  { icon: Palette, title: "Pick your occasions", body: "Weddings to interviews to a night out. Choose several and add your likes, dislikes and fit." },
];

const FEATURES = [
  { icon: Ruler, title: "Six distinct concepts", body: "Never six versions of one outfit. Each look has its own styling idea, adapted to the occasion." },
  { icon: Wallet, title: "Budget that holds", body: "Essentials are funded first. Swap any item and the total and remaining budget update instantly." },
  { icon: ShieldCheck, title: "Private by design", body: "Photos are processed in your browser, never uploaded or stored. Delete your data any time." },
];

export default function Home() {
  return (
    <div className="space-y-24">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-sage-dark">AI personal stylist · India</p>
          <p className="mb-4 -mt-2 inline-block -rotate-2 rounded-full border-2 border-charcoal bg-lime px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1F1F1F]">main character fits. on budget.</p>
          <h1 className="text-balance text-5xl leading-[1.05] sm:text-6xl">Your Style. Your Identity. Perfectly Matched.</h1>
          <p className="mt-6 max-w-lg text-lg text-taupe-dark">
            Share your measurements, budget and the occasion. fitsy builds complete outfits that suit your proportions, colouring and wallet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/onboarding" size="lg">Style me <ArrowRight size={18} /></ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="lg">How it works</ButtonLink>
          </div>
          <p className="mt-4 text-xs text-taupe">No account needed. Prices in INR.</p>
        </div>
        <HeroModels />
      </section>

      <section id="how" className="scroll-mt-24">
        <h2 className="mb-10 text-center text-4xl">Three steps to your looks</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-sage-light text-sage-dark"><s.icon size={20} /></div>
              <p className="text-xs text-taupe">Step {i + 1}</p>
              <h3 className="mt-1 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-taupe-dark">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid items-center gap-6 rounded-3xl border border-beige-deep bg-beige/50 p-8 md:grid-cols-[1fr_auto] md:p-12">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-lime text-charcoal"><Shirt size={20} /></div>
          <h2 className="text-3xl sm:text-4xl">Already own something you love?</h2>
          <p className="mt-2 max-w-xl text-taupe-dark">Upload a photo of one piece, like your black baggy pants. fitsy builds at least five outfits around it and tells you which occasion each is best for.</p>
        </div>
        <ButtonLink href="/build-around" size="lg">Build around my clothes <ArrowRight size={18} /></ButtonLink>
      </section>

      <section className="rounded-3xl bg-charcoal px-6 py-14 text-ivory sm:px-12">
        <h2 className="mb-10 text-center text-4xl">Styled like a human would</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <f.icon size={22} className="mb-3 text-sage" />
              <h3 className="text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-beige/80">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink href="/onboarding" variant="secondary" size="lg">Start your session <ArrowRight size={18} /></ButtonLink>
        </div>
      </section>
    </div>
  );
}
