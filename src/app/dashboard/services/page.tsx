// src/app/dashboard/services/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import styles from "./services.module.css";

type City = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

type ProviderProfile = {
  id: string;
  isApproved: boolean;
  companyName: string | null;
};

type Service = {
  id: string;
  title: string;
  description: string;
  city?: { name: string } | null;
  category?: { name: string } | null;
  priceFrom: number | null;
  createdAt: string;
  slug: string;
};

export default function DashboardServicesPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [providerProfile, setProviderProfile] =
    useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // forma
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");

  // nuotrauka
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  // 1) auth – pasiimam prisijungusį userį
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const userEmail = data.user.email;
      if (!userEmail) {
        router.replace("/login");
        return;
      }

      setEmail(userEmail);
    }

    loadUser();
  }, [router]);

  // 2) miestai ir kategorijos
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/dashboard/filters");
        if (!res.ok) return;
        const json = await res.json();
        setCities(json.cities ?? []);
        setCategories(json.categories ?? []);
      } catch (e) {
        console.error("filters error:", e);
      }
    }

    loadFilters();
  }, []);

  // 3) mano paslaugos + provider profilio info
  useEffect(() => {
    if (!email) return;

    async function load() {
      try {
        setLoading(true);
        setProfileLoading(true);
        setError(null);
        setSuccess(null);

        const res = await fetch("/api/dashboard/my-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const json = await res.json();

        if (!res.ok) {
          console.error("my-services failed:", json);
          setError("Nepavyko užkrauti duomenų.");
          return;
        }

        setServices(json.services ?? []);
        setProviderProfile(json.providerProfile ?? null);
      } catch (err) {
        console.error("my-services error:", err);
        setError("Nepavyko užkrauti duomenų.");
      } finally {
        setLoading(false);
        setProfileLoading(false);
      }
    }

    load();
  }, [email]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // 🔹 Nuotraukos upload į Supabase Storage (bucket: service-images)
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    const MAX_SIZE = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_SIZE) {
      setImageError("Nuotrauka per didelė (maks. 3MB).");
      return;
    }

    setImageUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const filePath = `services/${fileName}`;

      const { data, error } = await supabase.storage
        .from("service-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error || !data) {
        console.error("image upload error:", error);
        setImageError("Nepavyko įkelti nuotraukos.");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("service-images")
        .getPublicUrl(data.path);

      if (!publicData?.publicUrl) {
        setImageError("Nepavyko gauti nuotraukos adreso.");
        return;
      }

      setImageUrl(publicData.publicUrl);
    } catch (err) {
      console.error("image upload error:", err);
      setImageError("Serverio klaida keliant nuotrauką.");
    } finally {
      setImageUploading(false);
    }
  }

  // 🔹 Paslaugos kūrimas
  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (!email) return;

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/dashboard/create-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           email,
          title,
          description,
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          imageUrl: imageUrl || null,
        }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // jei grįžo ne JSON (pvz. HTML) – ignoruojam
      }

      if (!res.ok) {
        console.error("create-service failed:", json);
        const message =
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as any).error === "string"
            ? (json as any).error
            : "Nepavyko sukurti paslaugos.";
        setError(message);
        return;
      }

      // išvalom formą
      setTitle("");
      setDescription("");
      setCityId("");
      setCategoryId("");
      setPriceFrom("");
      setImageUrl("");
      setSuccess("Paslauga sėkmingai sukurta.");

      // persikraunam sąrašą
      const refresh = await fetch("/api/dashboard/my-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (refresh.ok) {
        const refreshedJson = await refresh.json();
        setServices(refreshedJson.services ?? []);
      }
    } catch (e) {
      console.error("create-service error:", e);
      setError("Serverio klaida kuriant paslaugą.");
    } finally {
      setCreating(false);
    }
  }

  if (!email || loading || profileLoading) {
    return (
      <main className={styles.container}>
        <p>Kraunama...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Mano paslaugos</h1>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          Atsijungti
        </button>
      </header>

      {error && <p className={styles.errorText}>{error}</p>}
      {success && <p className={styles.successText}>{success}</p>}

      {/* jei nėra profilio */}
      {!providerProfile && (
        <section className={styles.infoBox}>
          <div className={styles.infoBoxTitle}>
            Kol kas nesate paslaugų teikėjas.
          </div>
          <p>
            Norėdami skelbti paslaugas, pirmiausia užpildykite formą{" "}
            <Link href="/tapti-teikeju" className={styles.infoBoxLink}>
              „Tapti paslaugų teikėju“
            </Link>
            . Paraišką patvirtinus, galėsite kurti ir valdyti savo skelbimus.
          </p>
        </section>
      )}

      {/* jei paraiška dar nepatvirtinta */}
      {providerProfile && !providerProfile.isApproved && (
        <section className={styles.infoBox}>
          <div className={styles.infoBoxTitle}>
            Jūsų paraiška dar tikrinama.
          </div>
          <p>
            Administratorius peržiūrės jūsų pateiktą informaciją ir patvirtins
            paskyrą. Kai tik tai bus padaryta, čia galėsite kurti ir redaguoti
            savo paslaugas.
          </p>
        </section>
      )}

      {/* patvirtintas teikėjas – forma + sąrašas */}
      {providerProfile && providerProfile.isApproved && (
        <>
          {/* forma */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Sukurti naują paslaugą</h2>

            <form className={styles.form} onSubmit={handleCreateService}>
              <div className={styles.field}>
                <label className={styles.label}>Pavadinimas</label>
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Aprašymas</label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Miestas</label>
                  <select
                    className={styles.select}
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                  >
                    <option value="">Neparinkta</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Kategorija</label>
                  <select
                    className={styles.select}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Neparinkta</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Kaina nuo (NOK)</label>
                  <input
                    type="number"
                    min={0}
                    className={styles.input}
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    placeholder="Pvz. 200"
                  />
                </div>
              </div>

              {/* nuotraukos upload */}
              <div className={styles.field}>
                <label className={styles.label}>Paslaugos nuotrauka</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imageUploading && (
                  <p className={styles.helpText}>Nuotrauka keliama...</p>
                )}
                {imageError && (
                  <p className={styles.errorText}>{imageError}</p>
                )}
                {imageUrl && !imageUploading && !imageError && (
                  <p className={styles.helpText}>Nuotrauka sėkmingai įkelta.</p>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={creating}
                >
                  {creating ? "Kuriama..." : "Sukurti paslaugą"}
                </button>
              </div>
            </form>
          </section>

          {/* sąrašas */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Mano paslaugų sąrašas</h2>

            {services.length === 0 ? (
              <p className={styles.empty}>
                Dar neturite sukurtų paslaugų – sukurkite pirmąją aukščiau.
              </p>
            ) : (
              <ul className={styles.list}>
                {services.map((service) => (
                  <li key={service.id} className={styles.listItem}>
                    <div>
                      <div className={styles.serviceTitle}>
                        {service.title}
                      </div>
                      <div className={styles.serviceMeta}>
                        {service.city?.name && <span>{service.city.name}</span>}
                        {service.category?.name && (
                          <span>{service.category.name}</span>
                        )}
                        {service.priceFrom != null && (
                          <span>nuo {service.priceFrom} NOK</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.serviceActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() =>
                          router.push(`/services/${service.slug}`)
                        }
                      >
                        Peržiūrėti
                      </button>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() =>
                          router.push(
                            `/dashboard/services/${service.id}/edit`
                          )
                        }
                      >
                        Redaguoti
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
