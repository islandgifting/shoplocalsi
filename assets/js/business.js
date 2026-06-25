import { supabase } from "./supabase.js";

const id = new URLSearchParams(window.location.search).get("id");

async function load() {
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return;

  document.getElementById("bizName").innerText = data.name;
  document.getElementById("bizCategory").innerText = data.category;
  document.getElementById("bizDesc").innerText = data.description;
}

load();
