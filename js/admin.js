/* ==========================================================================
   Anniversaire hébraïque — espace administrateur (admin.html)

   Les six fonctions du haut parlent à Supabase :
   - verifierIdentifiants() : connexion
   - chargerContacts()      : liste des contacts
   - ajouterContact()       : ajout manuel d'une personne
   - modifierContact()      : modification d'une personne
   - supprimerContact()     : suppression d'une personne
   - deconnecter()          : fin de session

   Le calcul de la date est dans js/dates-hebraiques.js, la connexion à
   Supabase dans js/base-de-donnees.js (tous deux chargés avant).

   Le mot de passe est vérifié par Supabase, jamais dans ce fichier. Et
   même connecté, seul un compte inscrit dans prive.admins voit les
   contacts (règles RLS de supabase/schema.sql).
   ========================================================================== */
(function () {
  'use strict';

  var calculerDateHebraique = window.DatesHebraiques.calculerDateHebraique;
  var momentSelonChkia = window.DatesHebraiques.momentSelonChkia;
  var dateDuJour = window.DatesHebraiques.dateDuJour;
  var emailValide = window.DatesHebraiques.emailValide;
  var baseDeDonnees = window.baseDeDonnees;

  /* ------------------------------------------------------------------------
     Connexion
     Renvoie une Promise qui vaut true si les identifiants sont bons,
     false s'ils sont faux, et échoue si Supabase est injoignable.
     ------------------------------------------------------------------------ */
  function verifierIdentifiants(email, motDePasse) {
    return baseDeDonnees.auth.signInWithPassword({ email: email, password: motDePasse })
      .then(function (reponse) {
        if (!reponse.error) return true;
        if (reponse.error.code === 'invalid_credentials' || reponse.error.status === 400) return false;
        throw reponse.error;
      });
  }

  /* ------------------------------------------------------------------------
     Liste des contacts, les plus récents en premier.
     Renvoie une Promise avec un tableau d'objets :
       {
         id,
         prenom, nom,
         email: "moche@exemple.fr" ou null,  (null pour les inscrits d'avant le 29/10/2026)
         dateNaissance: "AAAA-MM-JJ",
         moment: "avant" | "apres",
         heureNaissance: "18:30" ou null,  (rempli si « Je ne suis pas sûr(e) »)
         lieuNaissance: "Perpignan, Occitanie, France" ou null,
         dateHebraique: "16 'Hechvan 5765",
         dateHebraiqueHebreu: "ט״ז חֶשְׁוָן תשס״ה",
         source: "formulaire" | "manuel",
         enregistreLe: "2026-10-28T00:14:00+00:00"   (date ISO)
       }
     ------------------------------------------------------------------------ */
  function chargerContacts() {
    return baseDeDonnees.from('contacts')
      .select('*')
      .order('enregistre_le', { ascending: false })
      .then(function (reponse) {
        if (reponse.error) throw reponse.error;
        return reponse.data.map(versContact);
      });
  }

  /* ------------------------------------------------------------------------
     Ajout manuel d'une personne.
     Renvoie une Promise avec le contact tel qu'il a été enregistré
     (avec son id et sa date d'enregistrement donnés par la base).
     ------------------------------------------------------------------------ */
  function ajouterContact(contact) {
    return baseDeDonnees.from('contacts')
      .insert(Object.assign(versLigne(contact), { source: 'manuel', consentement: true }))
      .select()
      .single()
      .then(function (reponse) {
        if (reponse.error) throw reponse.error;
        return versContact(reponse.data);
      });
  }

  /* ------------------------------------------------------------------------
     Modification d'une personne.
     Renvoie une Promise avec le contact complet après modification.
     ------------------------------------------------------------------------ */
  function modifierContact(id, changements) {
    return baseDeDonnees.from('contacts')
      .update(versLigne(changements))
      .eq('id', id)
      .select()
      .single() // échoue si aucune ligne n'a été modifiée
      .then(function (reponse) {
        if (reponse.error) throw reponse.error;
        return versContact(reponse.data);
      });
  }

  /* ------------------------------------------------------------------------
     Suppression d'une personne.
     Échoue si la ligne n'a pas réellement été supprimée.
     ------------------------------------------------------------------------ */
  function supprimerContact(id) {
    return baseDeDonnees.from('contacts')
      .delete()
      .eq('id', id)
      .select('id')
      .then(function (reponse) {
        if (reponse.error) throw reponse.error;
        if (reponse.data.length !== 1) throw new Error('Aucune ligne supprimée');
      });
  }

  /* ------------------------------------------------------------------------
     Déconnexion
     ------------------------------------------------------------------------ */
  function deconnecter() {
    return baseDeDonnees.auth.signOut();
  }

  /* Correspondance entre les noms du code (dateNaissance) et ceux de la
     base de données (date_naissance) */
  function versContact(ligne) {
    return {
      id: ligne.id,
      prenom: ligne.prenom,
      nom: ligne.nom,
      email: ligne.email,
      dateNaissance: ligne.date_naissance,
      moment: ligne.moment,
      heureNaissance: ligne.heure_naissance ? ligne.heure_naissance.slice(0, 5) : null, // "18:30:00" → "18:30"
      lieuNaissance: ligne.lieu_naissance,
      dateHebraique: ligne.date_hebraique,
      dateHebraiqueHebreu: ligne.date_hebraique_hebreu,
      source: ligne.source,
      enregistreLe: ligne.enregistre_le
    };
  }

  // heure et lieu : null quand « Je ne suis pas sûr(e) » n'est pas coché
  // (une modification qui décoche la case efface donc l'heure et le lieu)
  // e-mail : null quand le champ est vide (une modification peut l'effacer)
  function versLigne(contact) {
    return {
      prenom: contact.prenom,
      nom: contact.nom,
      email: contact.email || null,
      date_naissance: contact.dateNaissance,
      moment: contact.moment,
      heure_naissance: contact.heureNaissance || null,
      lieu_naissance: contact.lieuNaissance || null,
      date_hebraique: contact.dateHebraique,
      date_hebraique_hebreu: contact.dateHebraiqueHebreu
    };
  }

  /* ------------------------------------------------------------------------
     Interface
     ------------------------------------------------------------------------ */
  var $ = function (id) { return document.getElementById(id); };

  var ecranConnexion = $('ecran-connexion');
  var ecranContacts = $('ecran-contacts');
  var formulaireConnexion = $('formulaire-connexion');
  var champEmail = $('admin-email');
  var champMotDePasse = $('admin-mot-de-passe');
  var erreurConnexion = $('erreur-connexion');
  var texteErreurConnexion = $('erreur-connexion-texte');
  var boutonConnexion = $('btn-connexion');
  var texteBoutonConnexion = $('btn-connexion-texte');
  var corpsTable = $('corps-table-contacts');

  var ICONE_CHARGEMENT = '<svg class="tourne" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9"/></svg>';
  var ICONE_ERREUR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>';

  var NOMBRE_COLONNES = 12;

  var contacts = [];

  /* Connexion */
  formulaireConnexion.addEventListener('submit', function (evenement) {
    evenement.preventDefault();
    var email = champEmail.value.trim();
    var motDePasse = champMotDePasse.value;

    if (!email || !motDePasse) {
      afficherErreurConnexion('Veuillez remplir l’e-mail et le mot de passe.');
      return;
    }

    definirChargementConnexion(true);
    verifierIdentifiants(email, motDePasse)
      .then(function (valide) {
        if (!valide) {
          afficherErreurConnexion('Identifiants incorrects');
          return;
        }
        masquerErreurConnexion();
        formulaireConnexion.reset();
        return ouvrirListe();
      })
      .catch(function () {
        afficherErreurConnexion('Connexion impossible pour le moment. Veuillez réessayer.');
      })
      .then(function () {
        definirChargementConnexion(false);
      });
  });

  [champEmail, champMotDePasse].forEach(function (champ) {
    champ.addEventListener('input', masquerErreurConnexion);
  });

  function afficherErreurConnexion(message) {
    texteErreurConnexion.textContent = message;
    erreurConnexion.hidden = false;
    champEmail.setAttribute('aria-invalid', 'true');
    champMotDePasse.setAttribute('aria-invalid', 'true');
    champMotDePasse.value = '';
    champEmail.focus();
  }

  function masquerErreurConnexion() {
    erreurConnexion.hidden = true;
    champEmail.setAttribute('aria-invalid', 'false');
    champMotDePasse.setAttribute('aria-invalid', 'false');
  }

  function definirChargementConnexion(actif) {
    boutonConnexion.disabled = actif;
    boutonConnexion.classList.toggle('est-en-chargement', actif);
    boutonConnexion.setAttribute('aria-busy', String(actif));
    texteBoutonConnexion.innerHTML = actif ? ICONE_CHARGEMENT + 'Connexion…' : 'Se connecter';
  }

  /* Liste */
  function ouvrirListe() {
    return chargerContacts().then(function (liste) {
      contacts = liste || [];
      afficherContacts();
      ecranConnexion.hidden = true;
      ecranContacts.hidden = false;
      window.scrollTo(0, 0);
      $('titre-contacts').focus();
    });
  }

  function afficherContacts() {
    var nombre = contacts.length;
    $('compteur-nombre').textContent = nombre;
    $('compteur-libelle').textContent = nombre > 1 ? 'personnes' : 'personne';
    $('btn-telecharger-csv').disabled = nombre === 0;

    corpsTable.textContent = '';

    if (nombre === 0) {
      var ligneVide = document.createElement('tr');
      var celluleVide = document.createElement('td');
      celluleVide.colSpan = NOMBRE_COLONNES;
      celluleVide.className = 'tableau__vide';
      celluleVide.textContent = 'Aucun contact enregistré pour le moment.';
      ligneVide.appendChild(celluleVide);
      corpsTable.appendChild(ligneVide);
      return;
    }

    contacts.forEach(function (c) {
      var ligne = document.createElement('tr');
      ajouterCellule(ligne, c.prenom);
      ajouterCellule(ligne, c.nom);
      ajouterCellule(ligne, c.email);
      ajouterCellule(ligne, formaterDate(c.dateNaissance));
      ajouterCellule(ligne, libelleMoment(c.moment));
      ajouterCellule(ligne, c.heureNaissance);
      ajouterCellule(ligne, c.lieuNaissance);
      ajouterCellule(ligne, c.dateHebraique);
      var celluleHebreu = ajouterCellule(ligne, c.dateHebraiqueHebreu);
      celluleHebreu.className = 'colonne-hebreu';
      celluleHebreu.lang = 'he';
      celluleHebreu.dir = 'rtl';
      ajouterCellule(ligne, libelleSource(c.source));
      ajouterCellule(ligne, formaterDateHeure(c.enregistreLe));

      var actions = document.createElement('div');
      actions.className = 'tableau__actions';
      var nomComplet = c.prenom + ' ' + c.nom;
      actions.appendChild(creerBoutonAction('modifier', c.id, 'Modifier', nomComplet));
      actions.appendChild(creerBoutonAction('supprimer', c.id, 'Supprimer', nomComplet));
      ajouterCellule(ligne, '').appendChild(actions);

      corpsTable.appendChild(ligne);
    });
  }

  function ajouterCellule(ligne, texte) {
    var cellule = document.createElement('td');
    cellule.textContent = texte == null ? '' : texte; // textContent : pas d'injection HTML
    ligne.appendChild(cellule);
    return cellule;
  }

  function creerBoutonAction(action, id, libelle, nomComplet) {
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-ligne' + (action === 'supprimer' ? ' bouton-ligne--danger' : '');
    bouton.setAttribute('data-action', action);
    bouton.setAttribute('data-id', String(id));
    bouton.setAttribute('aria-label', libelle + ' ' + nomComplet);
    bouton.textContent = libelle;
    return bouton;
  }

  function trouverContact(id) {
    return contacts.filter(function (c) { return String(c.id) === String(id); })[0];
  }

  /* Boutons « Modifier » et « Supprimer » de chaque ligne */
  corpsTable.addEventListener('click', function (evenement) {
    var bouton = evenement.target.closest('button[data-action]');
    if (!bouton) return;
    var contact = trouverContact(bouton.getAttribute('data-id'));
    if (!contact) return;

    if (bouton.getAttribute('data-action') === 'modifier') {
      ouvrirFormulaire(contact);
    } else {
      demanderSuppression(contact, bouton);
    }
  });

  function demanderSuppression(contact, bouton) {
    var nomComplet = contact.prenom + ' ' + contact.nom;
    if (!window.confirm('Supprimer ' + nomComplet + ' de la liste ?\nCette action est définitive.')) return;

    bouton.disabled = true;
    supprimerContact(contact.id)
      .then(function () {
        contacts = contacts.filter(function (c) { return c !== contact; });
        if (String(idEnModification) === String(contact.id)) fermerFormulaire();
        afficherContacts();
        afficherConfirmation(nomComplet + ' a bien été supprimé(e).');
      })
      .catch(function () {
        bouton.disabled = false;
        window.alert('La suppression n’a pas pu être effectuée. Veuillez réessayer.');
      });
  }

  /* Téléchargement CSV (séparateur « ; » pour Excel en français) */
  $('btn-telecharger-csv').addEventListener('click', function () {
    var entetes = ['Prénom', 'Nom', 'E-mail', 'Date de naissance', 'Avant / après la nuit', 'Heure de naissance', 'Lieu de naissance', 'Date hébraïque', 'Date hébraïque (hébreu)', 'Source', 'Enregistré le'];
    var lignes = contacts.map(function (c) {
      return [
        c.prenom,
        c.nom,
        c.email,
        formaterDate(c.dateNaissance),
        libelleMoment(c.moment),
        c.heureNaissance,
        c.lieuNaissance,
        c.dateHebraique,
        c.dateHebraiqueHebreu,
        libelleSource(c.source),
        formaterDateHeure(c.enregistreLe)
      ];
    });

    var csv = [entetes].concat(lignes)
      .map(function (ligne) { return ligne.map(celluleCsv).join(';'); })
      .join('\r\n');

    // « ﻿ » : permet à Excel de lire correctement les accents et l'hébreu
    var fichier = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var lien = document.createElement('a');
    lien.href = URL.createObjectURL(fichier);
    lien.download = 'contacts-beth-habad-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(function () { URL.revokeObjectURL(lien.href); }, 1000);
  });

  function celluleCsv(valeur) {
    var texte = valeur == null ? '' : String(valeur);
    // Empêche Excel d'interpréter une cellule comme une formule
    if (/^[=+\-@\t\r]/.test(texte)) texte = "'" + texte;
    return '"' + texte.replace(/"/g, '""') + '"';
  }

  /* Ajout et modification d'une personne (même formulaire) */
  var formulairePersonne = $('formulaire-ajout');
  var titreFormulaire = $('titre-ajout');
  var boutonAjouter = $('btn-ajouter-personne');
  var champAjoutPrenom = $('ajout-prenom');
  var champAjoutNom = $('ajout-nom');
  var champAjoutEmail = $('ajout-email');
  var champAjoutDate = $('ajout-date-naissance');
  var champAjoutMoment = $('ajout-moment-naissance');
  var blocConsentement = $('bloc-ajout-consentement');
  var caseAjoutConsentement = $('ajout-consentement');
  var boutonEnregistrer = $('btn-enregistrer-ajout');
  var texteBoutonEnregistrer = $('btn-enregistrer-ajout-texte');
  var erreurFormulaire = $('erreur-ajout');
  var confirmation = $('confirmation-ajout');
  var boutonsMomentAjout = formulairePersonne.querySelectorAll('.choix__bouton');
  var caseAjoutIncertain = $('ajout-moment-incertain');
  var blocAjoutIncertain = $('ajout-bloc-incertain');
  var champAjoutHeure = $('ajout-heure-naissance');
  var champAjoutLieu = $('ajout-lieu-naissance');
  var infoAjoutChkia = $('ajout-info-chkia');

  var idEnModification = null; // null = ajout, sinon id de la personne modifiée

  /* « Je ne suis pas sûr(e) »
     On n'enregistre que le nom du lieu, pas ses coordonnées. Pour une
     modification, le moment calculé à l'enregistrement est donc gardé tant
     que la date, l'heure et le lieu ne changent pas ; sinon il faut choisir
     à nouveau le lieu dans la liste pour recalculer. */
  var lieuAjoutChoisi = null; // { libelle, latitude, longitude } choisi dans la liste
  var calculConserve = null;  // { lieu, dateNaissance, heure, moment } de la personne modifiée

  var reinitialiserLieuAjout = window.RechercheLieu.brancher(champAjoutLieu, $('ajout-suggestions-lieu'), function (lieu) {
    lieuAjoutChoisi = lieu;
    if (lieu) afficherErreurAjout(regleAjoutLieu, '');
    majInfoChkiaAjout();
  });

  caseAjoutIncertain.addEventListener('change', basculerIncertainAjout);
  champAjoutHeure.addEventListener('input', majInfoChkiaAjout);
  champAjoutDate.addEventListener('change', majInfoChkiaAjout);

  function basculerIncertainAjout() {
    var incertain = caseAjoutIncertain.checked;
    blocAjoutIncertain.hidden = !incertain;
    boutonsMomentAjout.forEach(function (b) { b.disabled = incertain; });
    if (!incertain) {
      afficherErreurAjout(regleAjoutHeure, '');
      afficherErreurAjout(regleAjoutLieu, '');
    }
    majInfoChkiaAjout();
  }

  // Vrai si la personne modifiée garde la même date, heure et lieu qu'à l'enregistrement
  function calculToujoursValable() {
    return !!calculConserve && !lieuAjoutChoisi &&
      champAjoutLieu.value === calculConserve.lieu &&
      champAjoutDate.value === calculConserve.dateNaissance &&
      champAjoutHeure.value === calculConserve.heure;
  }

  // Renvoie { moment } si on sait trancher, sinon null
  function majInfoChkiaAjout() {
    infoAjoutChkia.hidden = true;
    if (!caseAjoutIncertain.checked) return null;

    if (calculToujoursValable()) {
      choisirMomentAjout(calculConserve.moment);
      afficherInfoChkia('Moment calculé lors de l’enregistrement : ' + libelleMoment(calculConserve.moment).toLowerCase() +
        ' la tombée de la nuit. Pour recalculer, choisissez à nouveau le lieu dans la liste.');
      return { moment: calculConserve.moment };
    }
    if (!champAjoutDate.value || !champAjoutHeure.value || !lieuAjoutChoisi) return null;

    var calcul;
    try {
      calcul = momentSelonChkia({
        dateNaissance: champAjoutDate.value,
        heure: champAjoutHeure.value,
        latitude: lieuAjoutChoisi.latitude,
        longitude: lieuAjoutChoisi.longitude
      });
    } catch (e) {
      afficherInfoChkia('Impossible de calculer le coucher du soleil pour ce lieu.');
      return null;
    }

    choisirMomentAjout(calcul.moment);
    afficherInfoChkia('Le ' + formaterDate(champAjoutDate.value) + ' à ' + lieuAjoutChoisi.libelle.split(',')[0] +
      ', le soleil s’est couché à ' + calcul.chkia.replace(':', ' h ') + ' : ' + libelleMoment(calcul.moment).toLowerCase() + ' la tombée de la nuit.');
    return calcul;
  }

  function afficherInfoChkia(texte) {
    infoAjoutChkia.textContent = texte;
    infoAjoutChkia.hidden = false;
  }

  champAjoutDate.max = dateDuJour();

  boutonAjouter.addEventListener('click', function () {
    if (formulairePersonne.hidden || idEnModification !== null) ouvrirFormulaire(null); else fermerFormulaire();
  });
  $('btn-annuler-ajout').addEventListener('click', fermerFormulaire);

  function libelleBoutonEnregistrer() {
    return idEnModification === null ? 'Enregistrer' : 'Enregistrer les modifications';
  }

  // contact = null pour un ajout, ou la personne à modifier
  function ouvrirFormulaire(contact) {
    reinitialiserFormulaire();
    confirmation.hidden = true;
    idEnModification = contact ? contact.id : null;

    titreFormulaire.textContent = contact ? 'Modifier ' + contact.prenom + ' ' + contact.nom : 'Ajouter une personne';
    // L'accord a déjà été donné à l'inscription : pas besoin de le redemander
    blocConsentement.hidden = !!contact;
    texteBoutonEnregistrer.textContent = libelleBoutonEnregistrer();

    if (contact) {
      champAjoutPrenom.value = contact.prenom;
      champAjoutNom.value = contact.nom;
      champAjoutEmail.value = contact.email || '';
      champAjoutDate.value = contact.dateNaissance;
      choisirMomentAjout(contact.moment);

      if (contact.heureNaissance) {
        caseAjoutIncertain.checked = true;
        champAjoutHeure.value = contact.heureNaissance;
        champAjoutLieu.value = contact.lieuNaissance;
        calculConserve = {
          lieu: contact.lieuNaissance,
          dateNaissance: contact.dateNaissance,
          heure: contact.heureNaissance,
          moment: contact.moment
        };
        basculerIncertainAjout();
      }
    }

    formulairePersonne.hidden = false;
    boutonAjouter.setAttribute('aria-expanded', String(!contact));
    formulairePersonne.scrollIntoView({ block: 'nearest' });
    champAjoutPrenom.focus();
  }

  function fermerFormulaire() {
    reinitialiserFormulaire();
    idEnModification = null;
    formulairePersonne.hidden = true;
    boutonAjouter.setAttribute('aria-expanded', 'false');
  }

  function reinitialiserFormulaire() {
    formulairePersonne.reset();
    calculConserve = null;
    reinitialiserLieuAjout();
    basculerIncertainAjout();
    choisirMomentAjout('avant');
    reglesAjout.forEach(function (regle) { afficherErreurAjout(regle, ''); });
    erreurFormulaire.hidden = true;
  }

  boutonsMomentAjout.forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      choisirMomentAjout(bouton.getAttribute('data-moment'));
    });
  });

  function choisirMomentAjout(valeur) {
    champAjoutMoment.value = valeur;
    boutonsMomentAjout.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-moment') === valeur));
    });
  }

  var reglesAjout = [
    { champ: champAjoutPrenom, erreur: $('erreur-ajout-prenom'), verifier: function () {
      return champAjoutPrenom.value.trim() ? '' : 'Indiquez le prénom.';
    } },
    { champ: champAjoutNom, erreur: $('erreur-ajout-nom'), verifier: function () {
      return champAjoutNom.value.trim() ? '' : 'Indiquez le nom.';
    } },
    { champ: champAjoutEmail, erreur: $('erreur-ajout-email'), verifier: function () {
      var v = champAjoutEmail.value.trim();
      return !v || emailValide(v) ? '' : 'Cet e-mail ne semble pas valide.'; // facultatif ici
    } },
    { champ: champAjoutDate, erreur: $('erreur-ajout-date-naissance'), verifier: function () {
      var v = champAjoutDate.value;
      if (!v) return 'Indiquez la date de naissance.';
      if (v > dateDuJour()) return 'La date de naissance ne peut pas être dans le futur.';
      return '';
    } },
    { champ: caseAjoutConsentement, erreur: $('erreur-ajout-consentement'), verifier: function () {
      if (idEnModification !== null) return ''; // déjà donné à l'inscription
      return caseAjoutConsentement.checked ? '' : 'L’accord de la personne est nécessaire.';
    } }
  ];

  // Ces deux règles ne comptent que si « Je ne suis pas sûr(e) » est coché
  var regleAjoutHeure = { champ: champAjoutHeure, erreur: $('erreur-ajout-heure-naissance'), verifier: function () {
    return !caseAjoutIncertain.checked || champAjoutHeure.value ? '' : 'Indiquez l’heure de naissance.';
  } };
  var regleAjoutLieu = { champ: champAjoutLieu, erreur: $('erreur-ajout-lieu-naissance'), verifier: function () {
    if (!caseAjoutIncertain.checked || lieuAjoutChoisi || calculToujoursValable()) return '';
    return calculConserve
      ? 'La date, l’heure ou le lieu a changé : choisissez à nouveau le lieu dans la liste pour recalculer.'
      : 'Choisissez le lieu de naissance dans la liste proposée.';
  } };
  reglesAjout.splice(reglesAjout.length - 1, 0, regleAjoutHeure, regleAjoutLieu); // avant la case d'accord (dernière règle)

  function afficherErreurAjout(regle, message) {
    regle.champ.setAttribute('aria-invalid', message ? 'true' : 'false');
    regle.erreur.hidden = !message;
    regle.erreur.innerHTML = message ? ICONE_ERREUR : '';
    if (message) regle.erreur.appendChild(document.createTextNode(message));
  }

  function validerAjout() {
    var premierChampEnErreur = null;
    reglesAjout.forEach(function (regle) {
      var message = regle.verifier();
      afficherErreurAjout(regle, message);
      if (message && !premierChampEnErreur) premierChampEnErreur = regle.champ;
    });
    if (premierChampEnErreur) premierChampEnErreur.focus();
    return !premierChampEnErreur;
  }

  function definirChargementAjout(actif) {
    boutonEnregistrer.disabled = actif;
    boutonEnregistrer.classList.toggle('est-en-chargement', actif);
    boutonEnregistrer.setAttribute('aria-busy', String(actif));
    texteBoutonEnregistrer.innerHTML = actif ? ICONE_CHARGEMENT + 'Enregistrement…' : libelleBoutonEnregistrer();
  }

  function afficherConfirmation(message) {
    confirmation.textContent = message;
    confirmation.hidden = false;
  }

  formulairePersonne.addEventListener('submit', function (evenement) {
    evenement.preventDefault();
    erreurFormulaire.hidden = true;
    if (!validerAjout()) return;

    var donnees = {
      prenom: champAjoutPrenom.value.trim(),
      nom: champAjoutNom.value.trim(),
      email: champAjoutEmail.value.trim().toLowerCase(),
      dateNaissance: champAjoutDate.value,   // "AAAA-MM-JJ"
      moment: champAjoutMoment.value         // "avant" | "apres"
    };
    var heureEtLieu = { heureNaissance: null, lieuNaissance: null };

    if (caseAjoutIncertain.checked) {
      var calcul = majInfoChkiaAjout();
      if (!calcul) {
        erreurFormulaire.textContent = 'Impossible de savoir si la naissance a eu lieu avant ou après la tombée de la nuit. Décochez « Je ne suis pas sûr(e) » et choisissez vous-même.';
        erreurFormulaire.hidden = false;
        return;
      }
      donnees.moment = calcul.moment;
      heureEtLieu = { heureNaissance: champAjoutHeure.value, lieuNaissance: champAjoutLieu.value };
    }
    var id = idEnModification;

    definirChargementAjout(true);

    // La date hébraïque est toujours recalculée : la date civile a pu changer
    calculerDateHebraique(donnees)
      .then(function (resultat) {
        var complet = Object.assign({}, donnees, heureEtLieu, {
          dateHebraique: resultat.dateHebraique,
          dateHebraiqueHebreu: resultat.dateHebraiqueHebreu
        });
        if (id === null) {
          return ajouterContact(Object.assign(complet, { source: 'manuel', consentement: true }));
        }
        return modifierContact(id, complet);
      })
      .then(function (contact) {
        if (id === null) {
          contacts.unshift(contact); // le plus récent en haut du tableau
        } else {
          contacts = contacts.map(function (c) { return String(c.id) === String(id) ? contact : c; });
        }
        afficherContacts();
        fermerFormulaire();
        afficherConfirmation(contact.prenom + ' ' + contact.nom + (id === null ? ' a bien été ajouté(e) : ' : ' a bien été modifié(e) : ') + contact.dateHebraique + '.');
      })
      .catch(function () {
        erreurFormulaire.textContent = 'L’enregistrement n’a pas pu être effectué. Veuillez réessayer.';
        erreurFormulaire.hidden = false;
      })
      .then(function () {
        definirChargementAjout(false);
      });
  });

  /* Déconnexion */
  $('btn-deconnexion').addEventListener('click', function () {
    deconnecter().then(function () {
      fermerFormulaire();
      confirmation.hidden = true;
      contacts = [];
      corpsTable.textContent = '';
      ecranContacts.hidden = true;
      ecranConnexion.hidden = false;
      window.scrollTo(0, 0);
      champEmail.focus();
    });
  });

  /* Utilitaires */
  function libelleMoment(moment) {
    return moment === 'apres' ? 'Après' : 'Avant';
  }

  function libelleSource(source) {
    return source === 'manuel' ? 'Ajout manuel' : 'Site';
  }

  function formaterDate(iso) {
    if (!iso) return '';
    var p = iso.slice(0, 10).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function formaterDateHeure(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    var deux = function (n) { return String(n).padStart(2, '0'); };
    return deux(d.getDate()) + '/' + deux(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' · ' + deux(d.getHours()) + ':' + deux(d.getMinutes());
  }

  /* Déjà connecté (page rechargée) : on ouvre directement la liste */
  baseDeDonnees.auth.getSession().then(function (reponse) {
    if (reponse.data && reponse.data.session) {
      ouvrirListe().catch(function () {
        afficherErreurConnexion('Impossible de charger les contacts. Veuillez vous reconnecter.');
      });
    }
  });
})();
