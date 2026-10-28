/* ==========================================================================
   Anniversaire hébraïque — recherche du lieu de naissance (index.html)

   Pendant que la personne tape, on propose des villes trouvées par Photon
   (https://photon.komoot.io, données OpenStreetMap). Photon autorise ces
   suggestions « au fil de la frappe » ; on attend tout de même une courte
   pause dans la frappe pour ne pas lui envoyer une requête par lettre.

   Le lieu n'est valable que s'il a été choisi dans la liste : c'est ce
   qui nous donne ses coordonnées (latitude, longitude).
   ========================================================================== */
(function () {
  'use strict';

  var ADRESSE_PHOTON = 'https://photon.komoot.io/api/';
  var PAUSE_FRAPPE = 350;      // millisecondes sans frappe avant de chercher
  var LETTRES_MINIMUM = 2;

  /* ------------------------------------------------------------------------
     Recherche. Renvoie (Promise) un tableau de lieux :
       { libelle: "Perpignan, Occitanie, France", latitude, longitude }
     ------------------------------------------------------------------------ */
  function chercherLieux(texte) {
    var parametres = new URLSearchParams({ q: texte, lang: 'fr', limit: '6', osm_tag: 'place' });
    return fetch(ADRESSE_PHOTON + '?' + parametres)
      .then(function (reponse) {
        if (!reponse.ok) throw new Error('Photon : erreur ' + reponse.status);
        return reponse.json();
      })
      .then(function (json) {
        var vus = {};
        return json.features
          .map(function (f) {
            return {
              libelle: libelleLieu(f.properties),
              latitude: f.geometry.coordinates[1],   // Photon donne [longitude, latitude]
              longitude: f.geometry.coordinates[0]
            };
          })
          .filter(function (lieu) {
            // Plusieurs résultats portent parfois le même nom : on n'en garde qu'un
            if (vus[lieu.libelle]) return false;
            vus[lieu.libelle] = true;
            return true;
          });
      });
  }

  // "Perpignan, Occitanie, France" (sans répéter : "Casablanca, Casablanca-Settat, Maroc")
  function libelleLieu(p) {
    var morceaux = [p.name, p.state || p.county, p.country].filter(function (m, i, tous) {
      return m && tous.indexOf(m) === i;
    });
    return morceaux.join(', ');
  }

  /* ------------------------------------------------------------------------
     Branche la recherche sur un champ texte et sa liste de suggestions.
     surChoix(lieu) est appelé avec le lieu choisi, ou avec null dès que le
     texte est modifié après un choix.
     Renvoie une fonction pour tout remettre à zéro.
     ------------------------------------------------------------------------ */
  function brancher(champ, liste, surChoix) {
    var resultats = [];
    var indexActif = -1;
    var minuterie = null;
    var numeroRecherche = 0; // ignore les réponses arrivées dans le désordre

    champ.addEventListener('input', function () {
      surChoix(null);
      clearTimeout(minuterie);
      var texte = champ.value.trim();
      if (texte.length < LETTRES_MINIMUM) { fermer(); return; }

      minuterie = setTimeout(function () {
        var numero = ++numeroRecherche;
        chercherLieux(texte)
          .then(function (lieux) {
            if (numero === numeroRecherche) afficher(lieux);
          })
          .catch(function () {
            if (numero === numeroRecherche) afficherMessage('Recherche indisponible pour le moment. Réessayez dans un instant.');
          });
      }, PAUSE_FRAPPE);
    });

    // Clavier : flèches pour parcourir, Entrée pour choisir, Échap pour fermer
    champ.addEventListener('keydown', function (evenement) {
      if (liste.hidden || !resultats.length) return;
      if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowUp') {
        evenement.preventDefault();
        var pas = evenement.key === 'ArrowDown' ? 1 : -1;
        activer((indexActif + pas + resultats.length) % resultats.length);
      } else if (evenement.key === 'Enter' && indexActif >= 0) {
        evenement.preventDefault(); // n'envoie pas le formulaire
        choisir(indexActif);
      } else if (evenement.key === 'Escape') {
        fermer();
      }
    });

    // « mousedown » plutôt que « click » : le choix est pris avant que le champ perde le focus
    liste.addEventListener('mousedown', function (evenement) {
      var option = evenement.target.closest('[data-index]');
      if (!option) return;
      evenement.preventDefault();
      choisir(Number(option.getAttribute('data-index')));
    });

    champ.addEventListener('blur', fermer);

    function afficher(lieux) {
      resultats = lieux;
      indexActif = -1;
      liste.textContent = '';
      if (!lieux.length) { afficherMessage('Aucun lieu trouvé. Essayez un autre nom de ville.'); return; }

      lieux.forEach(function (lieu, i) {
        var option = document.createElement('li');
        option.id = liste.id + '-' + i;
        option.className = 'suggestions__option';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.setAttribute('data-index', String(i));
        option.textContent = lieu.libelle; // textContent : pas d'injection HTML
        liste.appendChild(option);
      });
      ouvrir();
    }

    function afficherMessage(message) {
      resultats = [];
      liste.textContent = '';
      var ligne = document.createElement('li');
      ligne.className = 'suggestions__message';
      ligne.textContent = message;
      liste.appendChild(ligne);
      ouvrir();
    }

    function activer(index) {
      indexActif = index;
      Array.prototype.forEach.call(liste.children, function (option, i) {
        option.setAttribute('aria-selected', String(i === index));
      });
      champ.setAttribute('aria-activedescendant', liste.id + '-' + index);
    }

    function choisir(index) {
      var lieu = resultats[index];
      champ.value = lieu.libelle;
      fermer();
      surChoix(lieu);
    }

    function ouvrir() {
      liste.hidden = false;
      champ.setAttribute('aria-expanded', 'true');
    }

    function fermer() {
      liste.hidden = true;
      champ.setAttribute('aria-expanded', 'false');
      champ.removeAttribute('aria-activedescendant');
    }

    return function reinitialiser() {
      clearTimeout(minuterie);
      numeroRecherche++;
      champ.value = '';
      fermer();
      surChoix(null);
    };
  }

  window.RechercheLieu = { brancher: brancher };
})();
