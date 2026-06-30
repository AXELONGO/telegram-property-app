import { NextResponse } from "next/server";

export async function GET() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  
  return NextResponse.json({
    raw: rawKey,
    length: rawKey.length,
    startsWithQuotes: rawKey.startsWith('"'),
    endsWithQuotes: rawKey.endsWith('"'),
    hasLiteralNewline: rawKey.includes("\\n"),
    hasRealNewline: rawKey.includes("\n"),
    first50: rawKey.substring(0, 50),
    last50: rawKey.substring(rawKey.length - 50)
  });
}
