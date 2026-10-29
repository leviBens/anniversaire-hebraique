/* ==========================================================================
   Anniversaire hébraïque — formulaire visiteur (index.html)

   Ce fichier gère uniquement l'interface :
   - choix avant / après la tombée de la nuit
   - « Je ne suis pas sûr(e) » : heure + lieu de naissance, et le moment
     est calculé automatiquement (chkia)
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
  var momentSelonChkia = window.DatesHebraiques.momentSelonChkia;
  var dateDuJour = window.DatesHebraiques.dateDuJour;
  var emailValide = window.DatesHebraiques.emailValide;
  var baseDeDonnees = window.baseDeDonnees;

  /* ------------------------------------------------------------------------
     Enregistrement du contact dans Supabase.
     Un visiteur n'a le droit que d'AJOUTER (pas de relire sa ligne) : on
     n'envoie donc que les colonnes du formulaire, sans demander de retour.
     L'heure et le lieu ne sont envoyés que si « Je ne suis pas sûr(e) »
     est coché (undefined = colonne absente de l'envoi).
     ------------------------------------------------------------------------ */
  function enregistrerContact(contact) {
    return baseDeDonnees.from('contacts').insert({
      prenom: contact.prenom,
      nom: contact.nom,
      email: contact.email,
      date_naissance: contact.dateNaissance,
      moment: contact.moment,
      heure_naissance: contact.heureNaissance,
      lieu_naissance: contact.lieuNaissance,
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
  var champEmail = $('email');
  var champDate = $('date-naissance');
  var champMoment = $('moment-naissance');
  var caseIncertain = $('moment-incertain');
  var blocIncertain = $('bloc-incertain');
  var champHeure = $('heure-naissance');
  var champLieu = $('lieu-naissance');
  var infoChkia = $('info-chkia');
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

  /* « Je ne suis pas sûr(e) » : les deux boutons sont bloqués, c'est le
     calcul qui choisit à partir de l'heure et du lieu */
  var lieuChoisi = null; // { libelle, latitude, longitude } choisi dans la liste

  var reinitialiserLieu = window.RechercheLieu.brancher(champLieu, $('suggestions-lieu'), function (lieu) {
    lieuChoisi = lieu;
    if (lieu) afficherErreur(regleLieu, '');
    majInfoChkia();
  });

  caseIncertain.addEventListener('change', function () {
    var incertain = caseIncertain.checked;
    blocIncertain.hidden = !incertain;
    boutonsMoment.forEach(function (b) { b.disabled = incertain; });
    if (!incertain) {
      afficherErreur(regleHeure, '');
      afficherErreur(regleLieu, '');
    }
    majInfoChkia();
  });

  champHeure.addEventListener('input', majInfoChkia);
  champDate.addEventListener('change', majInfoChkia);

  // Calcul dès que la date, l'heure et le lieu sont connus. Renvoie le
  // résultat de momentSelonChkia(), ou null s'il manque une information.
  function majInfoChkia() {
    infoChkia.hidden = true;
    if (!caseIncertain.checked || !champDate.value || !champHeure.value || !lieuChoisi) return null;

    var calcul;
    try {
      calcul = momentSelonChkia({
        dateNaissance: champDate.value,
        heure: champHeure.value,
        latitude: lieuChoisi.latitude,
        longitude: lieuChoisi.longitude
      });
    } catch (e) {
      infoChkia.textContent = 'Impossible de calculer le coucher du soleil pour ce lieu. Renseignez-vous auprès du Rav.';
      infoChkia.hidden = false;
      return null;
    }

    choisirMoment(calcul.moment);
    var ville = lieuChoisi.libelle.split(',')[0];
    var jour = champDate.value.split('-').reverse().join('/');
    infoChkia.textContent = 'Le ' + jour + ' à ' + ville + ', le soleil s’est couché à ' + calcul.chkia.replace(':', ' h ') +
      ' : vous êtes né(e) ' + (calcul.moment === 'apres' ? 'après' : 'avant') + ' la tombée de la nuit.';
    infoChkia.hidden = false;
    return calcul;
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
    { champ: champEmail, erreur: $('erreur-email'), verifier: function (v) {
      if (!v.trim()) return 'Veuillez indiquer votre e-mail.';
      return emailValide(v) ? '' : 'Cet e-mail ne semble pas valide (exemple : moche@exemple.fr).';
    } },
    { champ: champDate, erreur: $('erreur-date-naissance'), verifier: function (v) {
      if (!v) return 'Veuillez indiquer votre date de naissance.';
      if (v > dateDuJour()) return 'La date de naissance ne peut pas être dans le futur.';
      return '';
    } }
  ];

  // Ces deux règles ne comptent que si « Je ne suis pas sûr(e) » est coché
  var regleHeure = { champ: champHeure, erreur: $('erreur-heure-naissance'), verifier: function (v) {
    return !caseIncertain.checked || v ? '' : 'Veuillez indiquer votre heure de naissance.';
  } };
  var regleLieu = { champ: champLieu, erreur: $('erreur-lieu-naissance'), verifier: function () {
    return !caseIncertain.checked || lieuChoisi ? '' : 'Choisissez votre lieu de naissance dans la liste proposée.';
  } };
  regles.push(regleHeure, regleLieu);

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
      email: champEmail.value.trim().toLowerCase(),
      dateNaissance: champDate.value,      // "AAAA-MM-JJ"
      moment: champMoment.value            // "avant" | "apres"
    };
    var heureEtLieu = {};

    if (caseIncertain.checked) {
      var calcul = majInfoChkia();
      if (!calcul) {
        erreurEnvoi.textContent = 'Impossible de savoir si vous êtes né(e) avant ou après la tombée de la nuit. Décochez « Je ne suis pas sûr(e) » et choisissez vous-même, ou renseignez-vous auprès du Rav.';
        erreurEnvoi.hidden = false;
        return;
      }
      donnees.moment = calcul.moment;
      heureEtLieu = { heureNaissance: champHeure.value, lieuNaissance: lieuChoisi.libelle };
    }

    definirChargement(true);

    calculerDateHebraique(donnees)
      .then(function (resultat) {
        var contact = Object.assign({}, donnees, heureEtLieu, resultat, { consentement: true });
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
  var dernierResultat = null;
  var dernierPrenom = '';
  var imageEnPreparation = null; // Promise de l'image à partager

  function afficherResultat(prenom, resultat) {
    $('prenom-merci').textContent = prenom;
    $('date-hebraique').textContent = resultat.dateHebraique;
    $('date-hebraique-he').textContent = resultat.dateHebraiqueHebreu;
    $('prochain-anniversaire').textContent = resultat.prochainAnniversaire;

    dernierResultat = resultat;
    dernierPrenom = prenom;
    $('lien-google-agenda').href = window.Calendrier.lienGoogleAgenda(resultat);
    $('erreur-partage').hidden = true;

    preparerImage();

    ecranFormulaire.hidden = true;
    ecranResultat.hidden = false;
    window.scrollTo(0, 0);
    $('titre-merci').focus();
  }

  // L'image est préparée dès l'affichage du résultat : au clic, le menu de
  // partage doit s'ouvrir sans attendre, sinon Safari (iPhone) le bloque
  function preparerImage() {
    imageEnPreparation = window.ImagePartage.creerImage(Object.assign({ prenom: dernierPrenom }, dernierResultat));
    imageEnPreparation.catch(function () { /* l'erreur sera affichée au clic */ });
  }

  /* Ajouter à mon calendrier (Apple / Outlook) : fichier .ics */
  $('btn-calendrier-ics').addEventListener('click', function () {
    if (dernierResultat) window.Calendrier.telechargerIcs(dernierResultat);
  });

  /* Partager ma date d'anniversaire */
  $('btn-partager').addEventListener('click', function () {
    var bouton = this;
    if (!imageEnPreparation) return;
    bouton.disabled = true;
    imageEnPreparation
      .then(function (image) {
        return window.ImagePartage.partager(image, dernierPrenom);
      })
      .catch(function () {
        $('erreur-partage').textContent = 'L’image n’a pas pu être créée. Veuillez réessayer.';
        $('erreur-partage').hidden = false;
        preparerImage(); // nouvel essai au prochain clic
      })
      .then(function () {
        bouton.disabled = false;
      });
  });

  /* Faire une autre conversion */
  $('lien-nouvelle-conversion').addEventListener('click', function (evenement) {
    evenement.preventDefault();
    formulaire.reset();
    reinitialiserLieu();
    blocIncertain.hidden = true;
    infoChkia.hidden = true;
    boutonsMoment.forEach(function (b) { b.disabled = false; });
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
