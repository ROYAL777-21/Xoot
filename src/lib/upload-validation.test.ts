import { describe, expect, it } from "vitest";
import { safeFileName, validateCompletionPhotoUpload, validateKycUpload } from "./upload-validation";

describe("upload validation helpers", () => {
  it("normalises unsafe upload filenames", () => {
    expect(safeFileName("../../../id document final.pdf")).toBe("id-document-final.pdf");
    expect(safeFileName("***")).toBe("upload");
  });

  it("accepts approved KYC documents and rejects executables", () => {
    const pdf = new File(["%PDF"], "id.pdf", { type: "application/pdf" });
    const exe = new File(["MZ"], "tool.exe", { type: "application/x-msdownload" });

    expect(validateKycUpload(pdf)).toBeNull();
    expect(validateKycUpload(exe)).toContain("approved file types");
  });

  it("accepts completion photos but not PDFs", () => {
    const photo = new File(["image"], "after.webp", { type: "image/webp" });
    const pdf = new File(["%PDF"], "proof.pdf", { type: "application/pdf" });

    expect(validateCompletionPhotoUpload(photo)).toBeNull();
    expect(validateCompletionPhotoUpload(pdf)).toContain("approved file types");
  });
});
