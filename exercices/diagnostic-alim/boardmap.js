/* =========================================================================
   boardmap.js - Correspondance entre les ETIQUETTES des points de la carte
   (texte visible dans board-points.svg) et les noeuds du circuit.
   Modifiable a la main : ajuste la valeur si un point est mal associe.
   ========================================================================= */
window.BOARD_LABELS = {
  /* alimentation / rails */
  'VCC':'vccIC', 'vout':'outT', 'outT':'outT', 'out-0':'gnd',   /* borne + = outT, borne 0 = masse */
  /* transformateur (AC) : le 1er = haut, le 2e = bas (voir regle position) */
  'AC':'AC',
  /* potentiometre R4 */
  'R4':'refD', 'R4-0':'gnd', 'R4-pot':'oap',
  /* resistances de reference */
  'R2':'rB',                       /* haut=rB (rail), bas=ref (regle position) */
  'R3-in':'rC', 'R3-out':'vccR3',    /* R3 : entree=rC (rail), sortie=alim LM358 */
  'R3':'rC',                       /* repli (ancien nom) */
  'R1':'rD',                       /* haut=rD (rail), bas=d2a (regle position) */
  '+':'rA',                        /* + du pont D1 = debut du rail non regule */
  /* filtres */
  'C1':'rE', 'C1-0':'gnd', 'C2':'rF', 'C2-0':'gnd', 'C3':'refC', 'C3-0':'gnd',
  '-':'gnd',
  'C4':'oap2', 'C4-0':'gnd', 'C5 +':'vC', 'C5-0':'gnd',
  /* diodes */
  'D2':'d2a', 'D2-0':'gnd', 'D3-in':'refB', 'D3-0':'gnd', 'D4':'rG',
  /* transistors */
  'Q1b':'q1b', 'Q1c':'rG', 'Q1e':'q1e', 'Q2b':'q2b', 'Q2c':'rG', 'Q2e':'q1b',
  'D4-g':'rG',                     /* Q1c / D4 cathode / etage puissance = rG */
  'Q3e':'q1e', 'Q3b':'q3b', 'Q3c':'q3c',
  'Q4c':'q4c', 'Q4b':'q4b', 'Q4e':'gnd',
  /* resistance de sortie / shunt */
  'R8O':'vA', 'R8I':'q1eR',
  'R9':'vB',                       /* haut=vB (sortie), bas=q3b (regle position) */
  'R10':'q3c',                     /* gauche=q3c, droite=q4b (regle position) */
  'R11':'q4b', 'R11-0':'gnd', 'R12 +':'vD', 'R12-0':'gnd',
  'R7':'oaout', 'R7-out':'q2b', 'R7-in':'oaout',   /* bas (R7-in) = sortie AOP, haut vers Q2 */
  'R13':'q2b',                     /* ancien nom (si present) */
  /* commande */
  'R5':'oap',                      /* gauche=oap, droite=q4c (regle position) */
  'R6':'q4c',                      /* gauche=q4c, droite=oap2 (regle position) */
  /* ampli d'erreur */
  'InA':'oap2', 'InA+':'oap2', 'InA-':'vA', 'OutA':'oaout', 'GND':'gnd',
  /* canal B du LM358 : pattes non connectees (cote VCC) */
  'InB':'', 'InB-':'', 'InB+':'', 'OutB':''
};
