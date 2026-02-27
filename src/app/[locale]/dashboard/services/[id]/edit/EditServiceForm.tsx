// src/app/[locale]/dashboard/services/[id]/edit/EditServiceForm.tsx
"use client";

import { useMemo, useState, FormEvent, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./edit.module.css";

type Option = {
  id: string;
  name: string;
};

type InitialData = {
  id: string;
  title: string;
  description: string;
  cityId: string;
  categoryId: string;
  priceFrom: number | null;
  imageUrl: string | null;
  imagePath: string | null;
  highlights: string[];
  isActive?: boolean;
};

type Props = {
  initial: InitialData;
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

function getExt(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export default function EditServiceForm({ initial, cities, categories }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [cityId, setCityId] = useState(initial.cityId || "");
  const [categoryId, setCategoryId] = useState(initial.categoryId || "");
  const [priceFrom, setPriceFrom] = useState(
    initial.priceFrom != null ? String(initial.priceFrom) : "",
  );

  const [highlightsText, setHighlightsText] = useState(
    (initial.highlights ?? []).join("\n"),
  );

  const highlightsPreview = useMemo(
    () => parseHighlights(highlightsText),
    [highlightsText],
  );

  const [imageUrl, setImageUrl] = useState<string>(initial.imageUrl || "");
  const [imagePath, setImagePath] = useState<string>(initial.imagePath || "");
  const [uploading, setUploading] = useState(false);

  const [isActive, setIsActive] = useState<boolean>(initial.isActive ?? true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setError(null);
    setSuccess(null);

    if (!file.type.startsWith("image/")) {
      setError("Pasirinkite paveikslėlį (JPG / PNG / WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Nuotrauka per didelė. Maksimaliai 5MB.");
      return;
    }

    setUploading(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError("Turite būti prisijungęs, kad įkeltumėte nuotrauką.");
        return;
      }

      const userId = userData.user.id;
      const ext = getExt(file);
      const random = window.crypto.randomUUID();

      // tvarkingas path: userId/services/random.ext
      const path = `${userId}/services/${random}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error(uploadError);
        setError("Nepavyko įkelti nuotraukos.");
        return;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) {
        setError("Nepavyko gauti nuotraukos URL.");
        return;
      }

      setImageUrl(data.publicUrl);
      setImagePath(path);

      setSuccess("Nuotrauka įkelta. Nepamirškite išsaugoti pakeitimų.");
    } catch (e) {
      console.error(e);
      setError("Įvyko klaida įkeliant nuotrauką.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const highlights = parseHighlights(highlightsText);

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          imageUrl: imageUrl || null,
          imagePath: imagePath || null,
          highlights,
          isActive,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError((json as any)?.error || "Nepavyko išsaugoti paslaugos.");
        return;
      }

      setSuccess("Paslauga sėkmingai atnaujinta.");
      startTransition(() => {
        router.push(`/${locale}/dashboard/services`);
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError("Serverio klaida.");
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      "Ar tikrai nori ištrinti šią paslaugą? (Soft delete: paslauga dings iš sąrašo.)",
    );
    if (!ok) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError((json as any)?.error || "Nepavyko ištrinti paslaugos.");
        return;
      }

      startTransition(() => {
        router.push(`/${locale}/dashboard/services`);
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError("Serverio klaida.");
    }
  }

  async function handleToggleActive() {
    setError(null);
    setSuccess(null);

    const next = !isActive;
    setIsActive(next);

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: next }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setIsActive(!next);
        setError((json as any)?.error || "Nepavyko pakeisti aktyvumo.");
        return;
      }

      setSuccess(next ? "Paslauga įjungta." : "Paslauga išjungta.");
    } catch (e) {
      console.error(e);
      setIsActive(!next);
      setError("Serverio klaida.");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.errorText}>{error}</p>}
      {success && <p className={styles.successText}>{success}</p>}

      {/* ... tavo JSX palieku kaip buvo ... */}

      {/* (čia nieko nekeičiau žemiau, tik palikau kaip pas tave) */}

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Pagrindinė informacija</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Paslaugos pavadinimas</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Aprašymas</label>
          <textarea
            className={styles.textarea}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className={styles.charHint}>{description.length} / 2000 simbolių</div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Kodėl verta rinktis šią paslaugą?</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Privalumai (1 eilutė = 1 punktas)</label>
          <textarea
            className={styles.textarea}
            rows={5}
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            placeholder={"Pvz:\nGreita komunikacija\nGarantija\nAiškūs terminai"}
          />
          <div className={styles.charHint}>Punktų: {highlightsPreview.length} / 6</div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Detalės ir kaina</h2>

        <div className={styles.formRow}>
          <div className={styles.formCol}>
            <label className={styles.label}>Miestas</label>
            <select className={styles.select} value={cityId} onChange={(e) => setCityId(e.target.value)}>
              <option value="">Pasirinkti miestą</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formCol}>
            <label className={styles.label}>Kategorija</label>
            <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Pasirinkti kategoriją</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.priceRow}>
          <label className={styles.label}>Kaina nuo</label>
          <div className={styles.priceInput}>
            <input
              type="number"
              min={0}
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder="Pvz. 555"
            />
            <span>NOK</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Nuotraukos</h2>

        <div className={styles.uploadRow}>
          <label className={styles.uploadBtn}>
            {uploading ? "Įkeliama..." : "Įkelti nuotrauką"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading || pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setImageUrl("");
              setImagePath("");
            }}
            disabled={uploading || pending}
          >
            Pašalinti nuotrauką
          </button>
        </div>

        <div className={styles.imagePreview}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Nuotraukos peržiūra" />
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyText}>Nuotrauka neįkelta</span>
            </div>
          )}
        </div>

        <p className={styles.helpText}>Rekomenduojamas formatas: JPG / PNG / WEBP. Maks. 5MB.</p>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Aktyvumas</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span>
            Statusas: <strong>{isActive ? "Aktyvi" : "Išjungta"}</strong>
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleToggleActive}
            disabled={uploading || pending}
          >
            {isActive ? "Išjungti" : "Įjungti"}
          </button>
        </div>
      </section>

      <div className={styles.actionsBar}>
        <button type="button" className={styles.dangerButton} onClick={handleDelete} disabled={pending || uploading}>
          Ištrinti paslaugą
        </button>

        <div className={styles.actionsRight}>
          <button type="submit" className={styles.primaryButton} disabled={pending || uploading}>
            {pending ? "Saugoma..." : "Išsaugoti pakeitimus"}
          </button>
        </div>
      </div>
    </form>
  );
}