/* ==========================================================================
   Anniversaire hébraïque — connexion à Supabase (partagé par index.html et admin.html)

   L'adresse du projet et la clé « publishable » sont PUBLIQUES par nature :
   le navigateur du visiteur en a besoin pour parler à Supabase. Ce qui
   protège les données, ce sont les règles RLS de supabase/schema.sql.

   Ne JAMAIS mettre ici la clé secrète (sb_secret_… ou service_role).
   ========================================================================== */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://tczjfgxncckwziuirmcm.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Y49UioAHdPK0PNv-JcRs9w_SdXn2HhG';

  // La bibliothèque supabase-js, chargée avant ce fichier, fournit « supabase »
  window.baseDeDonnees = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();
