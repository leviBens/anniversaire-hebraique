/* ==========================================================================
   Anniversaire hébraïque — calculs de dates (partagé par index.html et admin.html)

   Un seul endroit pour le calcul : le formulaire visiteur et l'ajout
   manuel dans l'espace administrateur utilisent les mêmes fonctions.

   Le calendrier hébraïque lui-même est calculé par la bibliothèque Hebcal
   (https://github.com/hebcal/hebcal-es6, licence GPL-2.0), chargée avant
   ce fichier. Elle fournit la variable globale « hebcal ».
   ========================================================================== */
(function () {
  'use strict';

  /* Noms des mois en français, translittération 'Habad.
     Numérotation Hebcal : Nissan = 1 … Tichri = 7 … Adar = 12, Adar II = 13. */
  var MOIS_FRANCAIS = {
    1: 'Nissan', 2: 'Iyar', 3: 'Sivan', 4: 'Tamouz', 5: 'Av', 6: 'Eloul',
    7: 'Tichri', 8: "'Hechvan", 9: 'Kislev', 10: 'Tévet', 11: 'Chevat',
    12: 'Adar', 13: 'Adar II'
  };

  /* ------------------------------------------------------------------------
     Calcul principal
     Reçoit : { dateNaissance: "AAAA-MM-JJ", moment: "avant" | "apres" }
     Renvoie (Promise) :
       {
         dateHebraique:        "16 'Hechvan 5765",
         dateHebraiqueHebreu:  "ט״ז חֶשְׁוָן תשס״ה",
         prochainAnniversaire: "Mardi 16 novembre 2027",
         prochainAnniversaireIso: "2027-11-16"   (pour le calendrier)
       }
     ------------------------------------------------------------------------ */
  function calculerDateHebraique(donnees) {
    // Promise : une erreur de calcul devient un refus que l'interface sait afficher
    return Promise.resolve().then(function () {
      return calculer(donnees, new Date());
    });
  }

  // Version sans Promise, avec « aujourd'hui » en paramètre (utile pour les tests)
  function calculer(donnees, aujourdhui) {
    var naissance = dateHebraiqueDeNaissance(donnees.dateNaissance, donnees.moment);
    var anniversaire = prochainAnniversaire(naissance, aujourdhui);

    return {
      dateHebraique: formaterDateHebraique(naissance),
      dateHebraiqueHebreu: naissance.renderGematriya(),
      prochainAnniversaire: formaterDateCivile(anniversaire, aujourdhui),
      prochainAnniversaireIso: versTexteIso(anniversaire)
    };
  }

  /* Date civile + moment → date hébraïque.
     Après la tombée de la nuit, le jour hébraïque suivant a déjà commencé. */
  function dateHebraiqueDeNaissance(dateNaissance, moment) {
    var date = new window.hebcal.HDate(versDateLocale(dateNaissance));
    return moment === 'apres' ? date.next() : date;
  }

  /* Prochaine date civile de l'anniversaire hébraïque, aujourd'hui compris.
     getBirthdayOrAnniversary() gère les cas où la date n'existe pas chaque
     année (Adar dans une année embolismique, 30 'Hechvan, 30 Kislev). */
  function prochainAnniversaire(naissance, aujourdhui) {
    var hebcal = window.hebcal;
    var jour = new hebcal.HDate(debutDuJour(aujourdhui));
    var annee = jour.getFullYear();

    // Renvoie undefined pour l'année de naissance elle-même
    var anniversaire = hebcal.HebrewCalendar.getBirthdayOrAnniversary(annee, naissance);
    if (!anniversaire || anniversaire.abs() < jour.abs()) {
      anniversaire = hebcal.HebrewCalendar.getBirthdayOrAnniversary(annee + 1, naissance);
    }
    return anniversaire.greg();
  }

  /* ------------------------------------------------------------------------
     « Je ne suis pas sûr(e) » : né(e) avant ou après la tombée de la nuit ?
     Reçoit : { dateNaissance: "AAAA-MM-JJ", heure: "HH:MM", latitude, longitude }
     Renvoie : { moment: "avant" | "apres", chkia: "18:50" }

     Limite retenue : la chkia (coucher du soleil), à l'heure locale du lieu
     de naissance. Le fuseau horaire du lieu vient de tz-lookup (chargé avant
     ce fichier, variable globale « tzlookup ») ; le navigateur connaît
     l'heure d'été de chaque époque (pas d'heure d'été en France avant 1976).
     La chkia est arrondie à la minute inférieure : né(e) à 18:50 avec une
     chkia à 18:50 → après.
     ------------------------------------------------------------------------ */
  function momentSelonChkia(donnees) {
    var hebcal = window.hebcal;
    var fuseau = window.tzlookup(donnees.latitude, donnees.longitude);
    var lieu = new hebcal.Location(donnees.latitude, donnees.longitude, false, fuseau, 'Lieu de naissance');
    var chkia = new hebcal.Zmanim(lieu, versDateLocale(donnees.dateNaissance), false).shkiah();
    // Pas de coucher du soleil ce jour-là (régions polaires)
    if (!chkia || isNaN(chkia.getTime())) throw new Error('Coucher du soleil introuvable');

    var heureChkia = new Intl.DateTimeFormat('fr-FR', {
      timeZone: fuseau, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(chkia);

    return {
      moment: donnees.heure < heureChkia ? 'avant' : 'apres', // "HH:MM" se comparent comme du texte
      chkia: heureChkia
    };
  }

  /* Mise en forme */
  function formaterDateHebraique(date) {
    var mois = date.getMonth();
    var nomMois = MOIS_FRANCAIS[mois];
    // Dans une année embolismique, le premier Adar s'appelle Adar I
    if (mois === 12 && window.hebcal.HDate.isLeapYear(date.getFullYear())) nomMois = 'Adar I';
    return date.getDate() + ' ' + nomMois + ' ' + date.getFullYear();
  }

  function formaterDateCivile(date, aujourdhui) {
    var texte = date.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    if (aujourdhui && memeJour(date, aujourdhui)) return "Aujourd'hui, " + texte;
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  /* Utilitaires */

  // "AAAA-MM-JJ" → minuit heure locale. Surtout pas new Date("AAAA-MM-JJ"),
  // qui lit la date en heure UTC et peut la décaler d'un jour selon le pays.
  function versDateLocale(texte) {
    var p = texte.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function debutDuJour(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function memeJour(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function attendre(ms) {
    return new Promise(function (resoudre) { setTimeout(resoudre, ms); });
  }

  // Date → "AAAA-MM-JJ" en heure locale (l'inverse de versDateLocale)
  function versTexteIso(d) {
    var mois = String(d.getMonth() + 1).padStart(2, '0');
    var jour = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mois + '-' + jour;
  }

  function dateDuJour() {
    return versTexteIso(new Date());
  }

  window.DatesHebraiques = {
    calculerDateHebraique: calculerDateHebraique,
    calculer: calculer,
    momentSelonChkia: momentSelonChkia,
    dateDuJour: dateDuJour,
    attendre: attendre
  };
})();
