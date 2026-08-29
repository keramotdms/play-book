import { NextResponse } from "next/server";
import { clearSessionValue } from "@/lib/auth";

export async function POST() {
  await clearSessionValue();
  return NextResponse.json({ ok: true });
}
