export const MAX_KYC_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_COMPLETION_PHOTO_BYTES = 6 * 1024 * 1024;

export const KYC_UPLOAD_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
export const COMPLETION_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadValidationOptions = {
  allowedTypes: Set<string>;
  maxBytes: number;
  label: string;
};

export const safeFileName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 90) || "upload";

export const validateUploadFile = (file: File, options: UploadValidationOptions) => {
  if (!options.allowedTypes.has(file.type)) {
    return `Upload ${options.label} as one of the approved file types.`;
  }

  if (file.size > options.maxBytes) {
    const limitMb = Math.round(options.maxBytes / (1024 * 1024));
    return `Upload ${options.label} files smaller than ${limitMb}MB.`;
  }

  return null;
};

export const validateKycUpload = (file: File) =>
  validateUploadFile(file, {
    allowedTypes: KYC_UPLOAD_TYPES,
    maxBytes: MAX_KYC_UPLOAD_BYTES,
    label: "verification",
  });

export const validateCompletionPhotoUpload = (file: File) =>
  validateUploadFile(file, {
    allowedTypes: COMPLETION_PHOTO_TYPES,
    maxBytes: MAX_COMPLETION_PHOTO_BYTES,
    label: "completion photo",
  });
