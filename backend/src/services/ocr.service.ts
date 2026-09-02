// Mirrors malwareScan.service.ts's approach: file.controller.ts's ocrFile
// endpoint used to return a hardcoded block of canned placeholder text
// (a fixed "HR Policy Onboarding Guidelines..." sample) for every single
// PNG/JPEG/PDF, regardless of what the file actually contained — genuinely
// indistinguishable from a real extraction in the UI.
//
// I deliberately did NOT wire in a real OCR engine (e.g. tesseract.js)
// here, even though one could be added at the seam below. Reason: this
// module was written and reviewed in a sandboxed environment with no
// network access to the CDNs (jsdelivr/unpkg) that library uses to fetch
// its trained language data at runtime, so I had no way to actually run
// and verify a real recognition pass — and after doing that verification
// work for malwareScan.service.ts (a local mock server made that
// possible there), shipping OCR "as if verified" without being able to
// confirm it actually extracts text correctly felt like trading one
// dishonest feature for another, less-visible one. Better to be explicit
// that this is still a stub, with a clean integration point, than to
// claim it's real without having tested it.
//
// To make this real: implement extractTextWithRealEngine() below using
// tesseract.js (self-hosted trained-data files to avoid the CDN
// dependency in production), or an API-based engine (Google Cloud Vision,
// AWS Textract, Azure Document Intelligence) if a network-reachable
// service is preferred over an in-process one. Gate it the same way
// malwareScan.service.ts gates clamd — behind an env var so deployments
// that haven't configured it get the honest "not configured" result
// below instead of silently returning nothing or throwing.

export interface OcrResult {
  simulated: boolean;
  text: string;
  confidence: number | null;
}

const OCR_ENGINE = process.env.OCR_ENGINE; // e.g. 'tesseract' — unset means not configured

export function isRealOcrConfigured(): boolean {
  return !!OCR_ENGINE;
}

async function extractTextWithRealEngine(_buffer: Buffer, _mimeType: string): Promise<OcrResult> {
  // Intentionally unimplemented — see module comment above. Throwing here
  // (rather than silently falling through) means that if OCR_ENGINE is
  // ever set without actually wiring an engine in, callers get a loud
  // error instead of a quiet wrong answer.
  throw new Error(
    `OCR_ENGINE is set to "${OCR_ENGINE}" but no real engine is wired into extractTextWithRealEngine() yet.`
  );
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
  if (isRealOcrConfigured()) {
    return extractTextWithRealEngine(buffer, mimeType);
  }
  return {
    simulated: true,
    text: '',
    confidence: null,
  };
}
