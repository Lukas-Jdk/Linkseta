// src/lib/categoryIcons.ts
import type React from "react";
import {
  Hammer,
  Wrench,
  Droplet,
  Plug,
  WashingMachine,
  Car,
  Truck,
  Brush,
  Scissors,
  HeartPulse,
  GraduationCap,
  Baby,
  PawPrint,
  ChefHat,
  Camera,
  Laptop,
  Calculator,
  Scale,
  Building2,
  Home,
  Shapes,
  HelpCircle,
} from "lucide-react";

/**
 * SVARBU: map'inam pagal REALIUS slug iš DB (Prisma Studio).
 * Jei kada nors sutvarkysi slugify ir atnaujinsi slugus DB —
 * reikės pakeisti tik šitą map'ą.
 */
export const categoryIconMap: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  // Apskaita (apskaita)
  apskaita: Calculator,

  // Automobiliai (automobiliai)
  automobiliai: Car,

  // NT (nt)
  nt: Building2,

  // Statybos (statybos)
  statybos: Hammer,

  // Remontas (remontas)
  remontas: Wrench,

  // Santechnika (santechnika)
  santechnika: Droplet,

  // Elektra (elektra)
  elektra: Plug,

  // Buitinė technika (buitin-technika)
  "buitin-technika": WashingMachine,

  // Transportas (transportas)
  transportas: Truck,

  // Valymas (valymas)
  valymas: Brush,

  // Grožis (grois)
  grois: Scissors,

  // Sveikata (sveikata)
  sveikata: HeartPulse,

  // Teisinės paslaugos (teisins-paslaugos)
  "teisins-paslaugos": Scale,

  // IT paslaugos (it-paslaugos)
  "it-paslaugos": Laptop,

  // Fotografija (fotografija)
  fotografija: Camera,

  // Mokymai (mokymai)
  mokymai: GraduationCap,

  // Vaikų priežiūra (vaik-prieira)
  "vaik-prieira": Baby,

  // Gyvūnų priežiūra (gyvn-prieira)
  "gyvn-prieira": PawPrint,

  // Maistas / Kateris (maistas-kateris)
  "maistas-kateris": ChefHat,

  // Namų ūkis (nam-kis)
  "nam-kis": Home,

  // Kita (kita)
  kita: Shapes,
};

export const DefaultCategoryIcon = HelpCircle;
