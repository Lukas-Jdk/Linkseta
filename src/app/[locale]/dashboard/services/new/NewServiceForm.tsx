// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./NewServiceForm.module.css";

type Option = {
  id: string;
  name: string;
};

type Props = {
  cities: Option[];
  categories: Option[];
};

const BUCKET = "service-images";

function parseHighlights(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function loginUrl(locale: string, nextPath: string) {
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
}

export default function NewServiceForm({ cities, categories }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const locale = params?.locale ?? "lt";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");

  const [highlightsText, setHighlightsText] = useState("");
  const highlightsPreview = useMemo(() => parseHighlights(highlightsText), [highlightsText]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function onPickFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Pasirinkite paveikslėlį (JPG / PNG / WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Nuotrauka per didelė. Maksimaliai 5MB.");
      return;
    }

    setImageFile(file);

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  async function uploadServiceImage(serviceId: string): Promise<{ publicUrl: string; path: string } | null> {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError("Turite būti prisijungęs, kad įkeltumėte nuotrauką.");
        return null;
      }

      const ext = imageFile.name.split(".").pop() || "jpg";
      const userId = userData.user.id;
      const path = `${userId}/services/${serviceId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, imageFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error(uploadError);
        setError("Nepavyko įkelti nuotraukos.");
        return null;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) {
        setError("Nepavyko gauti nuotraukos URL.");
        return null;
      }

      return { publicUrl: data.publicUrl, path };
    } catch (e) {
      console.error(e);
      setError("Įvyko klaida įkeliant nuotrauką.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Pavadinimas ir aprašymas yra privalomi.");
      return;
    }

    const highlights = parseHighlights(highlightsText);

    setIsSubmitting(true);
    try {
      const res = await csrfFetch("/api/dashboard/services", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          imageUrl: null,
          imagePath: null,
          highlights,
        }),
      });

      if (res.status === 401) {
        router.push(loginUrl(locale, pathname));
        return;
      }
      if (res.status === 403) {
        setError("Neturite teikėjo statuso (DEMO planas / patvirtinimas).");
        return;
      }

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setError(json?.error || "Nepavyko sukurti paslaugos. Bandykite dar kartą vėliau.");
        return;
      }

      const serviceId = json.id as string;

      const uploaded = await uploadServiceImage(serviceId);

      if (uploaded) {
        const patchRes = await csrfFetch(`/api/dashboard/services/${serviceId}`, {
          method: "PATCH",
          body: JSON.stringify({
            imageUrl: uploaded.publicUrl,
            imagePath: uploaded.path,
          }),
        });

        if (!patchRes.ok) {
          console.warn("Image patch failed", await patchRes.text().catch(() => ""));
        }
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.errorText}>{error}</p>}

      {/* tavo JSX palieku kaip buvo */}
      {/* ... */}
      <button type="submit" className={styles.primaryButton} disabled={isSubmitting || uploading}>
        {isSubmitting ? "Kuriama..." : "Sukurti paslaugą"}
      </button>
    </form>
  );
}