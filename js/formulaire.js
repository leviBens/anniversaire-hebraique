/* ==========================================================================
   Anniversaire hébraïque — formulaire visiteur (index.html)

   Ce fichier gère uniquement l'interface :
   - choix avant / après la tombée de la nuit
   - bouton « Confirmer » désactivé tant que la case n'est pas cochée
   - messages d'erreur sous les champs vides
   - état de chargement « Enregistrement… »
   - affichage de l'écran de remerciement

   Le calcul de la date est dans js/dates-hebraiques.js, la connexion à
   Supabase dans js/base-de-donnees.js (tous deux chargés avant).
   ========================================================================== */
(function () {
  'use strict';

  var calculerDateHebraique = window.DatesHebraiques.calculerDateHebraique;
  var dateDuJour = window.DatesHebraiques.dateDuJour;
  var baseDeDonnees = window.baseDeDonnees;

  /* ------------------------------------------------------------------------
     Enregistrement du contact dans Supabase.
     Un visiteur n'a le droit que d'AJOUTER (pas de relire sa ligne) : on
     n'envoie donc que les colonnes du formulaire, sans demander de retour.
     ------------------------------------------------------------------------ */
  function enregistrerContact(contact) {
    return baseDeDonnees.from('contacts').insert({
      prenom: contact.prenom,
      nom: contact.nom,
      date_naissance: contact.dateNaissance,
      moment: contact.moment,
      date_hebraique: contact.dateHebraique,
      date_hebraique_hebreu: contact.dateHebraiqueHebreu,
      consentement: contact.consentement
    }).then(function (reponse) {
      if (reponse.error) throw reponse.error;
    });
  }

  /* ------------------------------------------------------------------------
     Interface
     ------------------------------------------------------------------------ */
  var $ = function (id) { return document.getElementById(id); };

  var formulaire = $('formulaire-conversion');
  var ecranFormulaire = $('ecran-formulaire');
  var ecranResultat = $('ecran-resultat');

  var champPrenom = $('prenom');
  var champNom = $('nom');
  var champDate = $('date-naissance');
  var champMoment = $('moment-naissance');
  var caseConsentement = $('consentement');
  var boutonConfirmer = $('btn-confirmer');
  var texteBoutonConfirmer = $('btn-confirmer-texte');
  var aideConfirmer = $('aide-confirmer');
  var erreurEnvoi = $('erreur-envoi');
  var boutonsMoment = document.querySelectorAll('.choix__bouton');

  var ICONE_ERREUR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>';
  var ICONE_CHARGEMENT = '<svg class="tourne" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9"/></svg>';

  // Pas de date de naissance dans le futur
  champDate.max = dateDuJour();

  /* Choix avant / après la tombée de la nuit */
  boutonsMoment.forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      choisirMoment(bouton.getAttribute('data-moment'));
    });
  });

  function choisirMoment(valeur) {
    champMoment.value = valeur;
    boutonsMoment.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-moment') === valeur));
    });
  }

  /* Bouton désactivé tant que la case n'est pas cochée */
  caseConsentement.addEventListener('change', majBoutonConfirmer);

  function majBoutonConfirmer() {
    boutonConfirmer.disabled = !caseConsentement.checked;
    aideConfirmer.hidden = caseConsentement.checked;
  }

  /* Validation */
  var regles = [
    { champ: champPrenom, erreur: $('erreur-prenom'), verifier: function (v) {
      return v.trim() ? '' : 'Veuillez indiquer votre prénom.';
    } },
    { champ: champNom, erreur: $('erreur-nom'), verifier: function (v) {
      return v.trim() ? '' : 'Veuillez indiquer votre nom.';
    } },
    { champ: champDate, erreur: $('erreur-date-naissance'), verifier: function (v) {
      if (!v) return 'Veuillez indiquer votre date de naissance.';
      if (v > dateDuJour()) return 'La date de naissance ne peut pas être dans le futur.';
      return '';
    } }
  ];

  function afficherErreur(regle, message) {
    regle.champ.setAttribute('aria-invalid', message ? 'true' : 'false');
    regle.erreur.hidden = !message;
    regle.erreur.innerHTML = message ? ICONE_ERREUR : '';
    if (message) regle.erreur.appendChild(document.createTextNode(message));
  }

  function valider() {
    var premierChampEnErreur = null;
    regles.forEach(function (regle) {
      var message = regle.verifier(regle.champ.value);
      afficherErreur(regle, message);
      if (message && !premierChampEnErreur) premierChampEnErreur = regle.champ;
    });
    if (premierChampEnErreur) premierChampEnErreur.focus();
    return !premierChampEnErreur;
  }

  // L'erreur disparaît dès que le champ est corrigé
  regles.forEach(function (regle) {
    var evenement = regle.champ.type === 'date' ? 'change' : 'input';
    regle.champ.addEventListener(evenement, function () {
      if (regle.champ.getAttribute('aria-invalid') === 'true' && !regle.verifier(regle.champ.value)) {
        afficherErreur(regle, '');
      }
    });
  });

  /* Chargement */
  function definirChargement(actif) {
    boutonConfirmer.classList.toggle('est-en-chargement', actif);
    boutonConfirmer.setAttribute('aria-busy', String(actif));
    formulaire.setAttribute('aria-busy', String(actif));
    boutonConfirmer.disabled = actif || !caseConsentement.checked;
    texteBoutonConfirmer.innerHTML = actif ? ICONE_CHARGEMENT + 'Enregistrement…' : 'Confirmer';
  }

  /* Envoi */
  formulaire.addEventListener('submit', function (evenement) {
    evenement.preventDefault();
    erreurEnvoi.hidden = true;

    if (!caseConsentement.checked) return;
    if (!valider()) return;

    var donnees = {
      prenom: champPrenom.value.trim(),
      nom: champNom.value.trim(),
      dateNaissance: champDate.value,      // "AAAA-MM-JJ"
      moment: champMoment.value            // "avant" | "apres"
    };

    definirChargement(true);

    calculerDateHebraique(donnees)
      .then(function (resultat) {
        var contact = Object.assign({}, donnees, resultat, { consentement: true });
        return enregistrerContact(contact).then(function () { return resultat; });
      })
      .then(function (resultat) {
        afficherResultat(donnees.prenom, resultat);
      })
      .catch(function () {
        erreurEnvoi.textContent = 'Une erreur est survenue, votre demande n’a pas pu être enregistrée. Veuillez réessayer.';
        erreurEnvoi.hidden = false;
      })
      .then(function () {
        definirChargement(false);
      });
  });

  /* Écran de remerciement */
  function afficherResultat(prenom, resultat) {
    $('prenom-merci').textContent = prenom;
    $('date-hebraique').textContent = resultat.dateHebraique;
    $('date-hebraique-he').textContent = resultat.dateHebraiqueHebreu;
    $('prochain-anniversaire').textContent = resultat.prochainAnniversaire;

    ecranFormulaire.hidden = true;
    ecranResultat.hidden = false;
    window.scrollTo(0, 0);
    $('titre-merci').focus();
  }

  /* Faire une autre conversion */
  $('lien-nouvelle-conversion').addEventListener('click', function (evenement) {
    evenement.preventDefault();
    formulaire.reset();
    choisirMoment('avant');
    regles.forEach(function (regle) { afficherErreur(regle, ''); });
    majBoutonConfirmer();

    ecranResultat.hidden = true;
    ecranFormulaire.hidden = false;
    window.scrollTo(0, 0);
    champPrenom.focus();
  });

  majBoutonConfirmer();
})();
