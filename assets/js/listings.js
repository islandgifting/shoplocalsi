import { supabase } from "./supabase.js";

async function load() {
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("active", true);

  const el = document.getElementById("featured");
  if (!el) return;

  el.innerHTML = (data || []).map(b => `
    <div class="card">
      <h3>${b.name}</h3>
      <p>${b.category}</p>
    </div>
  `).join("");
}

load();
