#!/bin/bash
# Lance le Gestionnaire de Produits (interface graphique)
# Double-cliquez sur ce fichier (ou exécutez ./gestion.sh) — pas besoin de taper python3.

# Se placer dans le dossier du script, quel que soit l'endroit d'où il est lancé
cd "$(dirname "$0")" || exit 1

# Vérifier que Python 3 est disponible
if ! command -v python3 >/dev/null 2>&1; then
    echo "Erreur : python3 n'est pas installé." >&2
    echo "Installez-le avec : sudo apt install python3 python3-tk" >&2
    read -rp "Appuyez sur Entrée pour fermer..."
    exit 1
fi

# Démarrer le gestionnaire
python3 gestionnaire_produits.py
