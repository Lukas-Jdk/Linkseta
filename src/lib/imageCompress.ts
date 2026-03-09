// src/lib/imageCompress.ts

type CompressOptions = {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nepavyko nuskaityti paveikslėlio."));
    };

    img.src = objectUrl;
  });
}

function calcSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function compressImageFile(
  file: File,
  options: CompressOptions,
): Promise<File> {
  const {
    maxWidth,
    maxHeight,
    quality = 0.82,
    mimeType = "image/jpeg",
  } = options;

  if (!file.type.startsWith("image/")) {
    throw new Error("Failas nėra paveikslėlis.");
  }

  const img = await loadImageFromFile(file);
  const nextSize = calcSize(img.width, img.height, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = nextSize.width;
  canvas.height = nextSize.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Nepavyko apdoroti paveikslėlio.");
  }

  ctx.drawImage(img, 0, 0, nextSize.width, nextSize.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });

  if (!blob) {
    throw new Error("Nepavyko suspausti paveikslėlio.");
  }

  const originalName = file.name.replace(/\.[^.]+$/, "");
  const ext = mimeType === "image/webp" ? "webp" : "jpg";

  return new File([blob], `${originalName}.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}