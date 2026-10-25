import { notFound } from "next/navigation";
import { demoLogin } from "@/app/actions/auth";

// Shareable demo links, e.g. /demo/admin from a portfolio.
export async function GET(_: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (role !== "customer" && role !== "agent" && role !== "admin") notFound();
  await demoLogin(role);
}
