/* ==========================================================================
   Anniversaire hébraïque — ajout du prochain anniversaire à un agenda

   Deux façons :
   - un fichier .ics (format standard, RFC 5545) : iPhone, Mac, Outlook ;
   - un lien Google Agenda, qui ouvre la page d'ajout d'un événement.

   Un seul événement, sur toute la journée civile du prochain anniversaire.
   Pas de répétition « chaque année » : la date civile change tous les ans.
   ========================================================================== */
(function () {
  'use strict';

  var TITRE = 'Mon anniversaire hébraïque';

  /* Reçoit le résultat de DatesHebraiques.calculer() */
  function description(resultat) {
    return 'Date hébraïque : ' + resultat.dateHebraique + ' (' + resultat.dateHebraiqueHebreu + ')';
  }

  // "2027-11-16" → "20271116", et le lendemain (fin exclue d'un événement « journée entière »)
  function jourCompact(iso) {
    return iso.replace(/-/g, '');
  }

  function lendemainCompact(iso) {
    var p = iso.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + 1);
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  /* ------------------------------------------------------------------------
     Fichier .ics
     ------------------------------------------------------------------------ */
  function contenuIcs(resultat, maintenant) {
    var horodatage = maintenant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20261028T120000Z
    var lignes = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Beth Habad de Perpignan//Anniversaire hebraique//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + maintenant.getTime() + '-' + Math.random().toString(36).slice(2) + '@anniversaire-hebraique',
      'DTSTAMP:' + horodatage,
      'DTSTART;VALUE=DATE:' + jourCompact(resultat.prochainAnniversaireIso),
      'DTEND;VALUE=DATE:' + lendemainCompact(resultat.prochainAnniversaireIso),
      'SUMMARY:' + protegerTexte(TITRE),
      'DESCRIPTION:' + protegerTexte(description(resultat)),
      'TRANSP:TRANSPARENT', // n'apparaît pas comme « occupé »
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    // Le format exige des fins de ligne Windows (\r\n)
    return lignes.map(plierLigne).join('\r\n') + '\r\n';
  }

  // Dans un .ics, \ ; , et les retours à la ligne doivent être protégés
  function protegerTexte(texte) {
    return texte.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  // Une ligne ne doit pas dépasser 75 octets : au-delà, on la coupe et la
  // suite commence par une espace. L'hébreu avec nikoud prend 2 octets par
  // caractère, d'où le comptage en octets et non en lettres.
  function plierLigne(ligne) {
    var encodeur = new TextEncoder();
    var morceaux = [];
    var courant = '';
    var octets = 0;
    Array.from(ligne).forEach(function (caractere) {
      var taille = encodeur.encode(caractere).length;
      var limite = morceaux.length ? 74 : 75; // l'espace de continuation compte
      if (octets + taille > limite) {
        morceaux.push(courant);
        courant = '';
        octets = 0;
      }
      courant += caractere;
      octets += taille;
    });
    morceaux.push(courant);
    return morceaux.join('\r\n ');
  }

  function telechargerIcs(resultat) {
    var fichier = new Blob([contenuIcs(resultat, new Date())], { type: 'text/calendar;charset=utf-8' });
    var lien = document.createElement('a');
    lien.href = URL.createObjectURL(fichier);
    lien.download = 'anniversaire-hebraique.ics';
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(function () { URL.revokeObjectURL(lien.href); }, 1000);
  }

  /* ------------------------------------------------------------------------
     Lien Google Agenda
     ------------------------------------------------------------------------ */
  function lienGoogleAgenda(resultat) {
    var parametres = new URLSearchParams({
      action: 'TEMPLATE',
      text: TITRE,
      dates: jourCompact(resultat.prochainAnniversaireIso) + '/' + lendemainCompact(resultat.prochainAnniversaireIso),
      details: description(resultat)
    });
    return 'https://calendar.google.com/calendar/render?' + parametres;
  }

  window.Calendrier = {
    contenuIcs: contenuIcs,
    telechargerIcs: telechargerIcs,
    lienGoogleAgenda: lienGoogleAgenda
  };
})();
