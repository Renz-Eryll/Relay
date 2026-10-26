import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="num text-[56px] leading-none font-medium tracking-tight text-brand-ink">#404</p>
        <h1 className="display mt-4 text-[24px]">This page doesn’t exist</h1>
        <p className="mt-1 text-[14px] text-muted">The ticket may have been removed, or you don’t have access to it.</p>
        <Link href="/" className="btn-outline mt-6">
          Go home
        </Link>
      </div>
    </main>
  );
}
