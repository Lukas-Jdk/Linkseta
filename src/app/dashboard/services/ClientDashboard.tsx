"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./services.module.css";
import { useRouter } from "next/navigation";

export default function ClientDashboard() {
  // čia visas tavo senas useState, useEffect, create logic
  return (
    <div>
      <p>Čia grąžinsim formą ir sąrašą</p>
    </div>
  );
}
