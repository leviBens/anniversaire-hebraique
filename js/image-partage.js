/* ==========================================================================
   Anniversaire hébraïque — image à partager (format story 1080 × 1920)

   L'image est dessinée dans le navigateur (canvas), avec les couleurs et
   les polices du site : rien n'est envoyé à un serveur.

   Puis :
   - sur téléphone, le menu de partage s'ouvre avec l'image jointe
     (WhatsApp, Instagram…) ;
   - sinon (ordinateur, navigateur trop ancien), l'image se télécharge.
   ========================================================================== */
(function () {
  'use strict';

  var LARGEUR = 1080;
  var HAUTEUR = 1920;
  var MARGE = 96;

  // Mêmes valeurs que les variables en haut de css/style.css
  var COULEURS = {
    pervenche: '#C9CEFF',
    peche: '#F59A6E',
    or: '#F4C46B',
    texte: '#FFFFFF',
    texteDoux: 'rgba(255, 255, 255, 0.82)',
    panneau: 'rgba(19, 15, 48, 0.80)',
    panneauLeger: 'rgba(19, 15, 48, 0.60)',
    trait: 'rgba(255, 255, 255, 0.14)',
    separateurDore: 'rgba(244, 196, 107, 0.45)'
  };
  var POLICES = {
    titre: "'Bebas Neue', 'Arial Narrow', sans-serif",
    texte: "'Montserrat', system-ui, sans-serif",
    hebreu: "'Frank Ruhl Libre', 'Noto Serif Hebrew', 'Times New Roman', serif"
  };

  /* ------------------------------------------------------------------------
     Dessin. Reçoit :
       { prenom, dateHebraique, dateHebraiqueHebreu, prochainAnniversaire }
     Renvoie (Promise) l'image PNG (Blob).
     ------------------------------------------------------------------------ */
  function creerImage(infos) {
    return chargerPolices(infos).then(function () {
      return chargerLogo();
    }).then(function (logo) {
      var toile = document.createElement('canvas');
      toile.width = LARGEUR;
      toile.height = HAUTEUR;
      var ctx = toile.getContext('2d');

      dessinerFond(ctx);
      dessinerEntete(ctx, logo);
      dessinerTitre(ctx, infos.prenom);
      dessinerDates(ctx, infos);

      return new Promise(function (resoudre, rejeter) {
        toile.toBlob(function (blob) {
          if (blob) resoudre(blob); else rejeter(new Error('Image non créée'));
        }, 'image/png');
      });
    });
  }

  // Le canvas n'attend pas les polices tout seul : on les charge avant de
  // dessiner (avec le texte hébreu, pour charger aussi les lettres hébraïques)
  function chargerPolices(infos) {
    if (!document.fonts) return Promise.resolve();
    return Promise.all([
      document.fonts.load('400 100px "Bebas Neue"'),
      document.fonts.load('600 30px "Montserrat"'),
      document.fonts.load('400 30px "Montserrat"'),
      document.fonts.load('500 90px "Frank Ruhl Libre"', infos.dateHebraiqueHebreu + ' ב״ה')
    ]).catch(function () { /* police de secours : l'image reste lisible */ });
  }

  function chargerLogo() {
    return new Promise(function (resoudre) {
      var image = new Image();
      image.onload = function () { resoudre(image); };
      image.onerror = function () { resoudre(null); }; // pas de logo plutôt que pas d'image
      // Logo intégré en texte (js/logo-base64.js) : fonctionne même en ouvrant
      // la page par double-clic, contrairement au fichier images/logo-habad-66.png
      image.src = window.LOGO_HABAD_66;
    });
  }

  /* Fond : même dégradé et mêmes formes que le site */
  function dessinerFond(ctx) {
    // Équivalent de « linear-gradient(172deg, …) » en CSS
    var angle = 172 * Math.PI / 180;
    var demi = (Math.abs(LARGEUR * Math.sin(angle)) + Math.abs(HAUTEUR * Math.cos(angle))) / 2;
    var dx = Math.sin(angle) * demi;
    var dy = -Math.cos(angle) * demi;
    var fond = ctx.createLinearGradient(LARGEUR / 2 - dx, HAUTEUR / 2 - dy, LARGEUR / 2 + dx, HAUTEUR / 2 + dy);
    fond.addColorStop(0, '#B44A72');
    fond.addColorStop(0.34, '#7A3F92');
    fond.addColorStop(0.66, '#3A2F82');
    fond.addColorStop(1, '#161842');
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

    // Forme en haut à droite
    dessinerForme(ctx, 960, 470, 300, 275, -14, [
      [0, '#FFC09A'], [0.2, '#F27C6E'], [0.42, '#C2558C'], [0.66, '#6A44A6'], [1, '#33348C']
    ], 1, true);
    // Forme en bas à gauche, sous les panneaux de dates
    dessinerForme(ctx, 60, 1900, 215, 205, 0, [
      [0, '#F7A47C'], [0.3, '#D9607C'], [0.7, '#6A44A6'], [1, '#2C2E7E']
    ], 0.85, false);
  }

  function dessinerForme(ctx, x, y, rx, ry, rotation, couleurs, opacite, ombre) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.globalAlpha = opacite;
    if (ombre) {
      ctx.shadowColor = 'rgba(10, 8, 40, 0.45)';
      ctx.shadowBlur = 70;
      ctx.shadowOffsetY = 36;
    }
    // Lumière décalée vers le haut, comme « radial-gradient(circle at 66% 38%, …) »
    var degrade = ctx.createRadialGradient(rx * 0.32, -ry * 0.24, 0, rx * 0.32, -ry * 0.24, Math.max(rx, ry) * 1.5);
    couleurs.forEach(function (c) { degrade.addColorStop(c[0], c[1]); });
    ctx.fillStyle = degrade;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* En-tête : logo + nom du Beth 'Habad, et ב״ה à droite */
  function dessinerEntete(ctx, logo) {
    var haut = 110;
    var hauteurLogo = 120;
    var xTexte = MARGE;
    if (logo) {
      var largeurLogo = logo.width * hauteurLogo / logo.height;
      ctx.drawImage(logo, MARGE, haut, largeurLogo, hauteurLogo);
      xTexte = MARGE + largeurLogo + 30;
    }

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ecrire(ctx, "BETH 'HABAD DE PERPIGNAN", xTexte, haut + 42, '600 30px ' + POLICES.texte, COULEURS.texte, '0.16em');
    ecrire(ctx, 'PYRÉNÉES-ORIENTALES', xTexte, haut + 88, '400 26px ' + POLICES.texte, COULEURS.texteDoux, '0.14em');

    ctx.textAlign = 'right';
    ecrire(ctx, 'ב״ה', LARGEUR - MARGE, haut + 40, '500 40px ' + POLICES.hebreu, COULEURS.texte, '0px', 'rtl');
  }

  /* Titre comme sur le site : « L'anniversaire / hébraïque / de Moché » */
  function dessinerTitre(ctx, prenom) {
    var largeurMax = LARGEUR - 2 * MARGE;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    var y = 560;
    ecrireAjuste(ctx, "L'anniversaire", MARGE, y, 170, POLICES.titre, COULEURS.pervenche, largeurMax);
    y += 158;
    ecrireAjuste(ctx, 'hébraïque', MARGE, y, 170, POLICES.titre, COULEURS.texte, largeurMax);
    y += 158;
    ecrireAjuste(ctx, de(prenom) + prenom, MARGE, y, 170, POLICES.titre, COULEURS.texte, largeurMax);
  }

  // « de Moché », mais « d'Avraham »
  function de(prenom) {
    return /^[aeiouyàâäéèêëîïôöûüAEIOUYÀÂÄÉÈÊËÎÏÔÖÛÜ]/.test(prenom) ? "d'" : 'de ';
  }

  /* Les deux panneaux de dates */
  function dessinerDates(ctx, infos) {
    var largeur = LARGEUR - 2 * MARGE;
    var interieur = largeur - 2 * 56;

    // Panneau principal : date de naissance hébraïque
    var y = 1010;
    panneau(ctx, MARGE, y, largeur, 470, COULEURS.panneau);
    libelleAvecTrait(ctx, 'DATE DE NAISSANCE HÉBRAÏQUE', MARGE + 56, y + 86);
    ctx.textAlign = 'left';
    ecrireAjuste(ctx, infos.dateHebraique, MARGE + 56, y + 222, 112, POLICES.titre, COULEURS.texte, interieur);
    ctx.fillStyle = COULEURS.separateurDore;
    ctx.fillRect(MARGE + 56, y + 280, interieur, 2);
    ctx.textAlign = 'right';
    ecrireAjuste(ctx, infos.dateHebraiqueHebreu, MARGE + largeur - 56, y + 400, 84, POLICES.hebreu, COULEURS.or, interieur, '500', 'rtl');

    // Panneau secondaire : prochain anniversaire
    y = 1520;
    panneau(ctx, MARGE, y, largeur, 260, COULEURS.panneauLeger);
    libelleAvecTrait(ctx, 'MON PROCHAIN ANNIVERSAIRE', MARGE + 56, y + 80);
    ctx.textAlign = 'left';
    ecrireAjuste(ctx, infos.prochainAnniversaire, MARGE + 56, y + 190, 76, POLICES.titre, COULEURS.texte, interieur);
  }

  function panneau(ctx, x, y, largeur, hauteur, couleur) {
    ctx.save();
    ctx.shadowColor = 'rgba(10, 8, 40, 0.35)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 30;
    ctx.fillStyle = couleur;
    arrondi(ctx, x, y, largeur, hauteur, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = COULEURS.trait;
    ctx.lineWidth = 2;
    arrondi(ctx, x, y, largeur, hauteur, 8);
    ctx.stroke();
  }

  function arrondi(ctx, x, y, l, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + l, y, x + l, y + h, r);
    ctx.arcTo(x + l, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + l, y, r);
    ctx.closePath();
  }

  // Petit trait pêche suivi d'un libellé en majuscules, comme « .libelle-trait »
  function libelleAvecTrait(ctx, texte, x, y) {
    ctx.fillStyle = COULEURS.peche;
    ctx.fillRect(x, y - 2, 48, 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ecrire(ctx, texte, x + 72, y, '600 28px ' + POLICES.texte, COULEURS.texte, '0.18em');
    ctx.textBaseline = 'alphabetic';
  }

  /* Écriture */
  function ecrire(ctx, texte, x, y, police, couleur, espacement, direction) {
    ctx.font = police;
    ctx.fillStyle = couleur;
    ctx.direction = direction || 'ltr';
    // Espacement des lettres : ignoré par les navigateurs qui ne le gèrent pas
    if ('letterSpacing' in ctx) ctx.letterSpacing = espacement || '0px';
    ctx.fillText(texte, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.direction = 'ltr';
  }

  // Réduit la taille du texte jusqu'à ce qu'il tienne dans la largeur (prénoms longs…)
  function ecrireAjuste(ctx, texte, x, y, taille, famille, couleur, largeurMax, graisse, direction) {
    graisse = graisse || '400';
    ctx.direction = direction || 'ltr';
    do {
      ctx.font = graisse + ' ' + taille + 'px ' + famille;
      taille -= 4;
    } while (ctx.measureText(texte).width > largeurMax && taille > 24);
    ctx.fillStyle = couleur;
    ctx.fillText(texte, x, y);
    ctx.direction = 'ltr';
  }

  /* ------------------------------------------------------------------------
     Partage ou téléchargement
     ------------------------------------------------------------------------ */
  function nomDeFichier(prenom) {
    var propre = prenom.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return 'anniversaire-hebraique' + (propre ? '-' + propre : '') + '.png';
  }

  // Renvoie une Promise ; un partage annulé par la personne n'est pas une erreur
  function partager(blob, prenom) {
    var nom = nomDeFichier(prenom);
    var fichier = new File([blob], nom, { type: 'image/png' });

    // Menu de partage seulement sur écran tactile (téléphone, tablette) :
    // sur ordinateur (même Safari sur Mac, qui sait partager), on télécharge
    var ecranTactile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (ecranTactile && navigator.canShare && navigator.canShare({ files: [fichier] })) {
      return navigator.share({ files: [fichier], title: 'Mon anniversaire hébraïque' })
        .catch(function (erreur) {
          if (erreur && erreur.name === 'AbortError') return; // menu fermé sans partager
          telecharger(blob, nom);
        });
    }
    telecharger(blob, nom);
    return Promise.resolve();
  }

  function telecharger(blob, nom) {
    var lien = document.createElement('a');
    lien.href = URL.createObjectURL(blob);
    lien.download = nom;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setTimeout(function () { URL.revokeObjectURL(lien.href); }, 1000);
  }

  window.ImagePartage = {
    creerImage: creerImage,
    partager: partager,
    nomDeFichier: nomDeFichier
  };
})();
