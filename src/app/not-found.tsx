import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-5xl">Page not found</h1>
      <p className="mx-auto mt-4 max-w-md text-taupe-dark">That page doesn&apos;t exist. Let&apos;s get you back to your styling session.</p>
      <ButtonLink href="/" className="mt-8">Back home</ButtonLink>
    </div>
  );
}
