/* =========================================================================
   procs.js - Fiches du mode "Diagnostic force" (guide par remontee).
   On remonte la CHAINE PHYSIQUE depuis la sortie jusqu'a la piece fautive.

   Types d'etapes :
     MESURE  : { txt, mm, p, n, expect:[lo,hi]|ol:true, ok, go }
               l'eleve place les sondes PUIS ECRIT la valeur lue ;
               l'app verifie que la valeur est dans la plage attendue.
     QUESTION: { ask, choices:[ {t, correct:true, go, fb} , {t, fb} ... ] }
     FIN     : { end:true, txt }

   Rappel de la carte (voir bulle "Comprendre la carte") :
     rail 21 V -> R8 (shunt 1 ohm, mesure du courant) -> Q1 (TIP41C passage)
     chute R8 ~0,7 V  =>  courant ~0,7 A  =>  LIMITEUR DE COURANT ACTIF.
   ========================================================================= */
window.FICHES = [

  /* ================================================================== */
  /* 0 V en sortie : on remonte R8 -> Q1 -> R7/Q2 -> AOP                */
  /* ================================================================== */

  { id:'Q1_be_open', num:1,
    titre:'Aucune sortie (0 V)',
    fault:{id:'Q1', mode:'bjt', be:'open', bc:'ok', ce:'ok', visible:false},
    resume:'Le regulateur ne delivre aucune tension en sortie.',
    start:'s1',
    steps:{
      s1:{ nrm:false, txt:'Mesurer la tension de SORTIE : sonde + sur OUT, sonde - sur GND.', mm:'V', p:'outT', n:'gnd', expect:[0,0.6], ok:'Sortie a 0 V.', go:'e1' },
      e1:{ nrm:false, txt:'Mesurer la sortie du shunt R8 / GND.', mm:'V', p:'vA', n:'gnd', expect:[0,0.6], ok:'Cote sortie de R8 : 0 V.', go:'e2' },
      e2:{ nrm:false, txt:'Mesurer l\'EMETTEUR de Q1 (broche E) / GND.', mm:'V', p:'q1e', n:'gnd', expect:[0,0.6], ok:'Emetteur de Q1 : 0 V.', go:'e3' },
      e3:{ txt:'Mesurer le COLLECTEUR de Q1 (broche C, = rail) / GND.', mm:'V', p:'rG', n:'gnd', expect:[19,22], ok:'Collecteur ~21 V : l\'etage de puissance EST alimente.', go:'e4' },
      e4:{ nrm:false, txt:'Mesurer la BASE de Q1 (broche B) / GND.', mm:'V', p:'q1b', n:'gnd', expect:[16,22], ok:'Base de Q1 : elle est bien commandee (~18 a 20 V).', go:'q4' },
      q4:{ ask:'Collecteur alimente, base commandee, mais emetteur a 0 V : quel est l\'etat de Q1 ?',
           noNorm:true,
           choices:[
             {t:'Normal', fb:'Non : s\'il etait normal, l\'emetteur serait commande et laisserait passer le courant.'},
             {t:'En court-circuit', fb:'Non : un court-circuit laisserait passer la tension vers la sortie, pas 0 V.'},
             {t:'Ouvert', correct:true, go:'d1',
              fb:'Exact : alimente et commande, mais aucun courant ne passe : Q1 est ouvert. Verifions la jonction.'} ] },
      d1:{ nrm:false, txt:'Hors tension, mode Diode : sonde + sur B de Q1, sonde - sur E.', mm:'diode', p:'q1b', n:'q1e', ol:true, ok:'Jonction B-E en circuit ouvert (O.L.).', go:'c1' },
      c1:{ end:true, txt:'Q1 est alimente et commande, mais sa jonction B-E est ouverte : le transistor de passage est defectueux.' }
    },
    reponse:{comp:'Q1', action:'remplacer'} },

  { id:'IC1_open', num:2,
    titre:'Aucune sortie (0 V)',
    fault:{id:'IC1', mode:'open', visible:false},
    resume:'Le regulateur ne delivre aucune tension en sortie.',
    start:'s1',
    steps:{
      s1:{ nrm:false, txt:'Mesurer la tension de SORTIE / GND.', mm:'V', p:'outT', n:'gnd', expect:[0,0.6], ok:'Sortie a 0 V.', go:'e1' },
      e1:{ nrm:false, txt:'Mesurer la sortie du shunt R8 / GND.', mm:'V', p:'vA', n:'gnd', expect:[0,0.6], ok:'Cote sortie de R8 : 0 V.', go:'e2' },
      e2:{ nrm:false, txt:'Mesurer l\'EMETTEUR de Q1 (broche E) / GND.', mm:'V', p:'q1e', n:'gnd', expect:[0,0.6], ok:'Emetteur de Q1 : 0 V.', go:'e3' },
      e3:{ txt:'Mesurer le COLLECTEUR de Q1 (broche C, = rail) / GND.', mm:'V', p:'rG', n:'gnd', expect:[19,22], ok:'Collecteur ~21 V : l\'etage est alimente.', go:'e4' },
      e4:{ nrm:false, txt:'Mesurer la BASE de Q1 (broche B) / GND.', mm:'V', p:'q1b', n:'gnd', expect:[0,0.8], ok:'Base de Q1 : 0 V.', go:'q4' },
      q4:{ nrm:false, ask:'Les conditions de fonctionnement de Q1 sont-elles reunies (collecteur alimente ET base commandee) ?',
           choices:[
             {t:'Oui : C ~21 V et B commandee', fb:'Non : ici la base est a 0 V, Q1 n\'est pas commande.'},
             {t:'Non : la base n\'est pas commandee (0 V)', correct:true, go:'e5',
              fb:'Exact : Q1 n\'est pas commande. On remonte la commande : Q2 puis R7 vers l\'AOP.'} ] },
      e5:{ nrm:false, txt:'Mesurer la base de Q2 (broche B de Q2, apres R7) / GND.', mm:'V', p:'q2b', n:'gnd', expect:[0,0.8], ok:'Base de Q2 : 0 V. La commande n\'arrive pas jusqu\'a Q2.', go:'e6' },
      e6:{ nrm:false, txt:'Mesurer la SORTIE de l\'AOP (broche 1, oaout) / GND.', mm:'V', p:'oaout', n:'gnd', expect:[0,0.8], ok:'Sortie de l\'AOP : 0 V.', go:'e7' },
      e7:{ txt:'Verifier l\'ALIMENTATION de l\'AOP (broche 8) / GND.', mm:'V', p:'vccIC', n:'gnd', expect:[19,22], ok:'Alimentation de l\'AOP : ~20,7 V.', go:'q7' },
      q7:{ ask:'L\'amplificateur est-il correctement alimente ?',
           choices:[
             {t:'Non, 0 V', fb:'Non : il est bien alimente (~20,7 V).'},
             {t:'Oui, ~20,7 V', correct:true, go:'e8', fb:'L\'AOP EST alimente (~20,7 V).'} ] },
      e8:{ txt:'Verifier la CONSIGNE : entree + de l\'AOP (broche 3) / GND.', mm:'V', p:'oap2', n:'gnd', expect:[10.5,13.5], ok:'Entree + (consigne) : ~12 V.', go:'q8' },
      q8:{ ask:'La consigne (entree +) est-elle presente ?',
           choices:[
             {t:'Non, 0 V', fb:'Non : la consigne est bien presente (~12 V).'},
             {t:'Oui, ~12 V', correct:true, go:'qaop',
              fb:'La consigne est bien presente (~12 V).'} ] },
      qaop:{ ask:'Recapitulons : l\'amplificateur est alimente, la consigne est presente, mais sa sortie reste a 0 V. Est-il fonctionnel ?',
             noNorm:true,
             choices:[
               {t:'Oui, il fonctionne normalement', fb:'Non : alimente et consigne presente, mais aucune sortie : il ne fonctionne pas.'},
               {t:'Non, il est en panne', correct:true, go:'c1',
                fb:'Exact : alimente et consigne presente, mais aucune sortie -> l\'amplificateur d\'erreur est defectueux.'} ] },
      c1:{ end:true, txt:'Le LM358 est alimente et recoit sa consigne, mais sa sortie reste a 0 V : l\'amplificateur d\'erreur est hors service.' }
    },
    reponse:{comp:'IC1', action:'remplacer'} },

  { id:'R3_open', num:3,
    titre:'Aucune sortie (0 V)',
    fault:{id:'R3', mode:'open', visible:false},
    resume:'Le regulateur ne delivre aucune tension en sortie.',
    start:'s1',
    steps:{
      s1:{ nrm:false, txt:'Mesurer la tension de SORTIE / GND.', mm:'V', p:'outT', n:'gnd', expect:[0,0.6], ok:'Sortie a 0 V.', go:'e1' },
      e1:{ nrm:false, txt:'Mesurer la sortie du shunt R8 / GND.', mm:'V', p:'vA', n:'gnd', expect:[0,0.6], ok:'Cote sortie de R8 : 0 V.', go:'e2' },
      e2:{ nrm:false, txt:'Mesurer l\'EMETTEUR de Q1 (broche E) / GND.', mm:'V', p:'q1e', n:'gnd', expect:[0,0.6], ok:'Emetteur de Q1 : 0 V.', go:'e3' },
      e3:{ txt:'Mesurer le COLLECTEUR de Q1 (broche C, = rail) / GND.', mm:'V', p:'rG', n:'gnd', expect:[19,22], ok:'Collecteur ~21 V : l\'etage est alimente.', go:'e4' },
      e4:{ nrm:false, txt:'Mesurer la BASE de Q1 (broche B) / GND.', mm:'V', p:'q1b', n:'gnd', expect:[0,0.8], ok:'Base de Q1 : 0 V.', go:'q4' },
      q4:{ nrm:false, ask:'Les conditions de fonctionnement de Q1 sont-elles reunies (collecteur alimente ET base commandee) ?',
           choices:[
             {t:'Oui : C ~21 V et B commandee', fb:'Non : ici la base est a 0 V, Q1 n\'est pas commande.'},
             {t:'Non : la base n\'est pas commandee (0 V)', correct:true, go:'e5',
              fb:'Exact : Q1 n\'est pas commande. On remonte vers Q2 / R7 puis l\'AOP.'} ] },
      e5:{ nrm:false, txt:'Mesurer la base de Q2 (broche B de Q2, apres R7) / GND.', mm:'V', p:'q2b', n:'gnd', expect:[0,0.8], ok:'Base de Q2 : 0 V. La commande n\'arrive pas.', go:'e6' },
      e6:{ nrm:false, txt:'Mesurer la SORTIE de l\'AOP (broche 1, oaout) / GND.', mm:'V', p:'oaout', n:'gnd', expect:[0,0.8], ok:'Sortie de l\'AOP : 0 V.', go:'e7' },
      e7:{ nrm:false, txt:'Verifier l\'ALIMENTATION de l\'AOP (broche 8) / GND.', mm:'V', p:'vccIC', n:'gnd', expect:[0,0.6], ok:'Alimentation de l\'AOP : 0 V.', go:'q7' },
      q7:{ nrm:false, ask:'L\'amplificateur est-il alimente ?',
           choices:[
             {t:'Non, 0 V', correct:true, go:'e7b', fb:'Aucune alimentation au LM358 : on remonte vers la source de cette alimentation (R3).'},
             {t:'Oui', fb:'Non : vccIC est a 0 V.'} ] },
      e7b:{ nrm:false, txt:'Mesurer la sortie de R3 (le cote AOP, avant la piste) / GND.', mm:'V', p:'vccR3', n:'gnd', expect:[0,0.6],
            ok:'Sortie de R3 : 0 V. La piece ne fournit donc rien (la piste vers l\'AOP n\'est pas en cause).', go:'e8' },
      e8:{ txt:'Mesurer le rail AVANT R3 / GND.', mm:'V', p:'rC', n:'gnd', expect:[19,22], ok:'Le rail est present (~21 V) avant R3, mais absent apres.', go:'q8' },
      q8:{ ask:'Le rail est-il present avant R3 ?',
           choices:[
             {t:'Non, 0 V', fb:'Non : le rail est bien present (~21 V) avant R3.'},
             {t:'Oui, ~21 V', correct:true, go:'d1', fb:'Le rail est la avant R3, mais pas apres : la resistance R3 est en cause.'} ] },
      d1:{ nrm:false, txt:'Hors tension, mode Ohm : mesurer entre les bornes de R3 (cote rail / cote LM358).', mm:'ohm', p:'rC', n:'vccIC', ol:true, ok:'Resistance en circuit ouvert (O.L.).', go:'c1' },
      c1:{ end:true, txt:'R3 est ouverte : elle ne fournit plus le LM358, qui ne peut donc plus commander le transistor de passage.' }
    },
    reponse:{comp:'R3', action:'remplacer'} },

  /* ================================================================== */
  /* 0 V par COURT-CIRCUIT en sortie : logique du LIMITEUR de courant    */
  /* ================================================================== */
  { id:'C5_short', num:4,
    titre:'Aucune sortie (0 V)',
    fault:{id:'C5', mode:'short', visible:false},
    resume:'Le regulateur ne delivre aucune tension en sortie.',
    start:'s1',
    steps:{
      s1:{ nrm:false, txt:'Mesurer la tension de SORTIE / GND.', mm:'V', p:'outT', n:'gnd', expect:[0,0.3], ok:'Sortie a 0 V : elle est ecrasee, la sortie est comme reliee a la masse.', go:'e0' },
      e0:{ nrm:false, txt:'Mesurer la sortie du shunt R8 (le point interne cote sortie) / GND.', mm:'V', p:'vA', n:'gnd', expect:[0,0.3],
           ok:'Sortie de R8 : 0 V, comme la borne de sortie : le chemin interne est continu (aucune piste coupee entre R8 et la borne).', go:'e1' },
      e1:{ nrm:false, txt:'Garder la sonde - (COM) sur GND et mesurer l\'entree du shunt R8 (l\'emetteur de Q1) / GND.', mm:'V', p:'q1e', n:'gnd', expect:[0.4,1.1],
           ok:'Entree du shunt R8 (emetteur de Q1) : ~0,7 V, alors que la sortie est a 0 V : il y a donc ~0,7 V de chute dans R8 (shunt 1 ohm), soit ~0,7 A. La LIMITATION de courant est active : surintensite, donc court-circuit en aval du limiteur.', go:'e2' },
      e2:{ nrm:false, txt:'Mesurer la base de Q1 (broche B) / GND.', mm:'V', p:'q1b', n:'gnd', expect:[1.0,1.8], ok:'Base de Q1 : ~1,4 V (et emetteur ~0,7 V d\'apres la mesure precedente). Vbe ~0,7 V : Q1 conduit.', go:'q4' },
      q4:{ nrm:false, ask:'Base ~1,4 V et emetteur ~0,7 V : que conclus-tu sur Q1 ?',
           choices:[
             {t:'Il est bloque, la commande est absente', fb:'Non : Vbe ~0,7 V (1,4 - 0,7), donc Q1 est bien polarise et conduit.'},
             {t:'Il est polarise (Vbe ~0,7 V) et conduit, mais la sortie reste effondree : quelque chose ecrase la tension', correct:true, go:'qth',
              fb:'Exact : Q1 conduit (Vbe ~0,7 V) mais la sortie est ecrasee -> court-circuit en aval.'} ] },
      qth:{ nrm:false, ask:'Observation thermique (camera) : quelles pieces chauffent ?',
            choices:[
              {t:'C5 est brulant, R8 / Q1 chauds, et R12 reste froide', correct:true, go:'d1',
               fb:'Exact : C5 brulant = le court est en sortie ; R12 froide car aucun courant ne la traverse.'},
              {t:'R12 est brulante', fb:'Non : R12 reste froide, aucun courant ne la traverse.'},
              {t:'Tout est froid', fb:'Non : C5 est brulante, le court dissipe de la puissance.'} ] },
      d1:{ nrm:false, txt:'Hors tension, mode Ohm : mesurer entre la SORTIE et GND.', mm:'ohm', p:'outT', n:'gnd', expect:[0,5], ok:'Resistance ~0 ohm : court-circuit franc en sortie.', go:'qcomp' },
      qcomp:{ nrm:false, ask:'D\'apres toi, quel composant laisse passer le courant ? Rappel : C5 est brulant, R12 reste froide.',
              choices:[
                {t:'R12 (elle reste froide)', fb:'Non : si le courant la traversait, elle chaufferait. Une piece froide n\'est pas traversee par le courant.'},
                {t:'R8, le shunt', fb:'Non : R8 ne fait que mesurer le courant. Le composant qui chauffe, c\'est celui qui laisse tout passer.'},
                {t:'C5, le condensateur de sortie (il est brulant)', correct:true, go:'c1',
                 fb:'Exact : c\'est lui qui chauffe, donc c\'est lui qui laisse passer le courant : C5 est perce.'} ] },
      c1:{ end:true, txt:'Le limiteur est actif (chute R8 ~0,7 V) et Q1 conduit, mais la sortie est ecrasee : court-circuit en sortie. C5 est brulant (R12 reste froide) : le condensateur de sortie C5 est perce.' }
    },
    reponse:{comp:'C5', action:'remplacer'} },

  /* ================================================================== */
  /* Sortie presente mais fausse / absente a la borne                    */
  /* ================================================================== */

  { id:'D3_open', num:5,
    titre:'Sortie trop haute',
    fault:{id:'D3', mode:'open', visible:false},
    resume:'La tension de sortie depasse la valeur demandee.',
    start:'s1',
    steps:{
      s1:{ nrm:false, txt:'Mesurer la tension de SORTIE / GND.', mm:'V', p:'outT', n:'gnd', expect:[13,16],
           ok:'Sortie trop haute (~13 a 15 V au lieu de ~12 V).', go:'e0' },
      e0:{ nrm:false, txt:'Mesurer la sortie du shunt R8 (le point interne cote sortie) / GND.', mm:'V', p:'vA', n:'gnd', expect:[13,16],
           ok:'Sortie de R8 : meme valeur que la borne de sortie : le chemin interne est continu.', go:'e1' },
      e1:{ nrm:false, txt:'Mesurer l\'entree du shunt R8 (= l\'emetteur de Q1) / GND.', mm:'V', p:'q1e', n:'gnd', expect:[13,16],
           ok:'Entree de R8 : meme valeur que sa sortie. Aucune chute dans R8 : le courant est normal, la protection n\'est pas active.', go:'e2' },
      e2:{ txt:'Mesurer le COLLECTEUR de Q1 (broche C, = rail) / GND.', mm:'V', p:'rG', n:'gnd', expect:[19,22],
           ok:'Collecteur ~21 V : l\'etage de puissance EST alimente.', go:'e3' },
      e3:{ nrm:false, txt:'Mesurer la BASE de Q1 (broche B) / GND.', mm:'V', p:'q1b', n:'gnd', expect:[13,16],
           ok:'Base de Q1 : elle est trop haute (~13 a 15 V).', go:'q3' },
      q3:{ nrm:false, ask:'Le collecteur est alimente et Q1 conduit, mais sa base est trop haute. Que conclure ?',
           choices:[
             {t:'La base est normale (~12,6 V)', fb:'Non : elle est trop haute (~13 a 15 V).'},
             {t:'Q1 est fautif : on le remplace', fb:'Non : Q1 obeit a sa commande. C\'est la commande qui est trop forte.'},
             {t:'La commande de Q1 est trop forte : Q1 obeit, on remonte vers l\'AOP', correct:true, go:'e5',
              fb:'Exact : Q1 n\'est pas fautif, il suit sa commande. On remonte vers la sortie de l\'AOP.'} ] },
      e5:{ nrm:false, txt:'Mesurer la SORTIE de l\'AOP (broche 1) / GND.', mm:'V', p:'oaout', n:'gnd', expect:[14,17],
           ok:'Sortie de l\'AOP : ~16 V. L\'amplificateur commande fort.', go:'evcc' },
      evcc:{ nrm:true, txt:'Verifier d\'abord son ALIMENTATION : entree Vcc de l\'AOP (broche 8) / GND.', mm:'V', p:'vccIC', n:'gnd', expect:[19,22],
           ok:'Alimentation de l\'AOP : ~20,7 V : l\'amplificateur est bien alimente.', go:'e6' },
      e6:{ nrm:false, txt:'Mesurer l\'entree + de l\'AOP (= aux bornes de C4) / GND.', mm:'V', p:'oap2', n:'gnd', expect:[13,16],
           ok:'Entree + (la consigne) : ~14,8 V. La tension sur C4 est la meme : C4 ne fuit pas.', go:'q67' },
      q67:{ nrm:false, ask:'L\'entree + (la consigne) vaut ~14,8 V, et le retour de sortie mesure plus tot (vA) vaut la meme valeur. Que conclus-tu ?',
            choices:[
              {t:'L\'AOP est en panne', fb:'Non : ses deux entrees sont egales, il fait donc son travail de regulation.'},
              {t:'L\'AOP regule normalement, mais la consigne (entree +) est trop haute', correct:true, go:'e8',
               fb:'Exact : l\'AOP regule (In+ = In-). La tension trop haute est donc la CONSIGNE elle-meme : remontons-la vers R4.'} ] },
      e8:{ nrm:false, txt:'Suivre la consigne vers l\'amont : remonter a travers R6 puis R5 et mesurer le curseur du potentiometre R4 / GND.', mm:'V', p:'oap', n:'gnd', expect:[13,16],
           ok:'Meme valeur qu\'en entree + : aucune chute dans R6 ni R5. La tension trop haute vient donc directement du curseur de R4, c\'est-a-dire de la reference.', go:'e9' },
      e9:{ nrm:false, txt:'Mesurer l\'entree de R4 (le cote reference, borne "+") / GND.', mm:'V', p:'refD', n:'gnd', expect:[17,21],
           ok:'Entree de R4 : ~19,7 V. Elle depasse 16 V : le probleme est donc plus en amont, dans la reference elle-meme.', go:'q10' },
      q10:{ nrm:false, ask:'La reference (entree de R4) est trop haute. Qu\'est-ce qui devrait la fixer a 16 V ?',
            choices:[
              {t:'La zener D3', correct:true, go:'c1',
               fb:'Exact : la reference est fixee par la zener D3 (16 V). Elle est trop haute : D3 ne regule plus.'},
              {t:'Le rail 21 V', fb:'Non : le rail est en amont de R2, il n\'est pas la reference.'},
              {t:'L\'AOP', fb:'Non : l\'AOP consomme la reference, il ne la fixe pas.'} ] },
      c1:{ end:true, txt:'Le rail et la protection sont normaux ; la sortie a suivi la consigne, mais cette consigne vient d\'une reference trop haute (~19,7 V au lieu de 16 V). La reference est fixee par la zener D3 : elle ne regule plus, D3 est ouverte.' }
    },
    reponse:{comp:'D3', action:'remplacer'} },

  { id:'PT_OUT_open', num:6,
    titre:'Aucune sortie a la borne',
    fault:{id:'PT_OUT', mode:'open', visible:false},
    resume:'La borne de sortie reste a 0 V.',
    start:'s1',
    steps:{
      s1:{ nrm:false, txt:'Mesurer la tension a la BORNE de sortie / GND.', mm:'V', p:'outT', n:'gnd', expect:[0,0.6], ok:'0 V a la borne de sortie.', go:'e1' },
      e1:{ nrm:true, txt:'En interne, mesurer la sortie du shunt R8 / GND.', mm:'V', p:'vA', n:'gnd', expect:[0,16],
           ok:'Sortie de R8 : la tension interne est bien presente (reglable de 0 a 16 V).', go:'e2' },
      e2:{ nrm:true, txt:'Continuer le long de la sortie : mesurer au niveau de R9 / GND.', mm:'V', p:'vB', n:'gnd', expect:[0,16],
           ok:'Ici aussi la tension est presente.', go:'e3' },
      e3:{ nrm:true, txt:'Mesurer aux bornes de C5 / GND.', mm:'V', p:'vC', n:'gnd', expect:[0,16],
           ok:'Toujours present : C5 n\'est pas en court-circuit.', go:'e4' },
      e4:{ nrm:true, txt:'Mesurer au niveau de R12 / GND.', mm:'V', p:'vD', n:'gnd', expect:[0,16],
           ok:'La tension est encore presente ici, apres R12.', go:'q2' },
      q2:{ nrm:false, ask:'La tension est presente jusqu\'a R12, mais reste a 0 V a la borne de sortie. Que conclus-tu ?',
           choices:[
             {t:'Tout le circuit de sortie est bon', fb:'Non : la borne reste a 0 V alors que la tension est presente en amont.'},
             {t:'La tension ne traverse pas entre R12 et la borne de sortie', correct:true, go:'qc',
              fb:'Exact : la tension est presente jusqu\'a R12, mais rien n\'arrive a la borne : la coupure est entre R12 et la borne.'} ] },
      qc:{ nrm:false, ask:'Quelle pourrait etre la cause de cette coupure ?',
           choices:[
             {t:'R12 en court-circuit', fb:'Non : un court-circuit de R12 ne couperait pas la tension vers la borne (et la protection s\'activerait).'},
             {t:'R12 ouverte', fb:'Non : si R12 etait ouverte, la tension serait absente AVANT elle (entre C5 et R12).'},
             {t:'C5 en court-circuit', fb:'Non : C5 en court-circuit activerait la protection (chute dans R8), ce n\'est pas le cas.'},
             {t:'La masse (GND) coupee', fb:'Non : toutes les autres mesures par rapport a GND sont normales.'},
             {t:'La piste de sortie (ou une soudure) coupee entre R12 et la borne', correct:true, go:'c1',
              fb:'Exact : tout est bon en amont, mais rien n\'arrive a la borne : la piste de sortie est ouverte.'} ] },
      c1:{ end:true, txt:'La regulation est correcte et la tension traverse tout l\'etage de sortie jusqu\'a R12, mais rien n\'arrive a la borne : la piste de sortie est coupee.' }
    },
    reponse:{comp:'PT_OUT', action:'piste'} }

];
