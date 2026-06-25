import { supabase } from "./supabase.js";

async function load() {
  const { data } = await supabase.from("businesses").select("*");

  document.getElementById("totalBiz").innerText = data.length;
  document.getElementById("activeBiz").innerText =
    data.filter(x => x.active).length;
  document.getElementById("featuredBiz").innerText =
    data.filter(x => x.featured).length;
}

load();
