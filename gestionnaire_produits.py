#!/usr/bin/env python3
"""
Gestionnaire de Produits — Site V2.2
Interface graphique pour modifier, ajouter et ajuster les produits et prix
du fichier produits.json sans éditer le fichier manuellement.
"""

import json
import os
import shutil
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, filedialog
from datetime import datetime

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "produits.json")
CONVERT_SCRIPT = os.path.join(BASE_DIR, "convert_step.js")

# ─── Couleurs ──────────────────────────────────────────────────────────────────
BG        = "#1e1e2e"
PANEL     = "#2a2a3e"
ENTRY_BG  = "#3a3a52"
ACCENT    = "#7c3aed"
ACCENT_H  = "#6d28d9"
GREEN     = "#10b981"
GREEN_H   = "#059669"
RED       = "#dc2626"
RED_H     = "#b91c1c"
TEXT      = "#e2e8f0"
PURPLE    = "#a78bfa"
MUTED     = "#94a3b8"
BORDER    = "#4a4a6a"


# ─── I/O JSON ──────────────────────────────────────────────────────────────────

def load_data():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    backup = JSON_PATH + f".bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(JSON_PATH, backup)
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return backup


# ─── Application principale ────────────────────────────────────────────────────

class ProductManager(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Gestionnaire de Produits")
        self.geometry("1150x720")
        self.minsize(900, 600)
        self.configure(bg=BG)

        self.data = load_data()
        self.current_idx = None
        self.modified = False
        self._loading = False
        self.option_vars = []

        self._setup_styles()
        self._build_ui()
        self._refresh_list()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── Styles ─────────────────────────────────────────────────────────────────

    def _setup_styles(self):
        s = ttk.Style(self)
        s.theme_use("clam")

        s.configure("TFrame",           background=BG)
        s.configure("Panel.TFrame",     background=PANEL)

        s.configure("TLabel",           background=BG,    foreground=TEXT,   font=("Segoe UI", 10))
        s.configure("Panel.TLabel",     background=PANEL, foreground=TEXT,   font=("Segoe UI", 10))
        s.configure("Muted.TLabel",     background=PANEL, foreground=MUTED,  font=("Segoe UI", 9, "italic"))
        s.configure("Title.TLabel",     background=PANEL, foreground=PURPLE, font=("Segoe UI", 12, "bold"))
        s.configure("Header.TLabel",    background=BG,    foreground=PURPLE, font=("Segoe UI", 16, "bold"))
        s.configure("Section.TLabel",   background=PANEL, foreground=PURPLE, font=("Segoe UI", 10, "bold"))
        s.configure("Price.TLabel",     background=PANEL, foreground=GREEN,  font=("Segoe UI", 12, "bold"))

        s.configure("TEntry",
            fieldbackground=ENTRY_BG, foreground=TEXT,
            insertcolor=TEXT, bordercolor=BORDER, relief="flat")

        s.configure("TNotebook",        background=BG,    bordercolor=BG)
        s.configure("TNotebook.Tab",    background=ENTRY_BG, foreground=TEXT, padding=[14, 5])
        s.map("TNotebook.Tab", background=[("selected", ACCENT)], foreground=[("selected", "white")])

        for name, bg, hover in [
            ("Accent.TButton",  ACCENT, ACCENT_H),
            ("Green.TButton",   GREEN,  GREEN_H),
            ("Red.TButton",     RED,    RED_H),
            ("Small.TButton",   ENTRY_BG, BORDER),
        ]:
            s.configure(name, background=bg, foreground="white",
                        font=("Segoe UI", 9, "bold"), borderwidth=0, relief="flat")
            s.map(name, background=[("active", hover)])

        s.configure("Treeview",
            background=PANEL, foreground=TEXT,
            fieldbackground=PANEL, rowheight=36, font=("Segoe UI", 10))
        s.configure("Treeview.Heading",
            background=ENTRY_BG, foreground=PURPLE, font=("Segoe UI", 10, "bold"))
        s.map("Treeview",
            background=[("selected", ACCENT)],
            foreground=[("selected", "white")])

        s.configure("TSeparator", background=BORDER)

    # ── UI principale ──────────────────────────────────────────────────────────

    def _build_ui(self):
        # En-tête
        header = ttk.Frame(self)
        header.pack(fill="x", padx=14, pady=(12, 6))

        ttk.Label(header, text="⚙  Gestionnaire de Produits", style="Header.TLabel").pack(side="left")

        self.save_btn = ttk.Button(
            header, text="  💾  Sauvegarder  ",
            style="Green.TButton", command=self._save)
        self.save_btn.pack(side="right", padx=4, ipady=4)

        self.status_var = tk.StringVar(value="Prêt")
        ttk.Label(header, textvariable=self.status_var,
                  background=BG, foreground=MUTED,
                  font=("Segoe UI", 9, "italic")).pack(side="right", padx=14)

        ttk.Separator(self, orient="horizontal").pack(fill="x", padx=14, pady=2)

        # Conteneur principal
        content = ttk.Frame(self)
        content.pack(fill="both", expand=True, padx=14, pady=8)
        content.columnconfigure(1, weight=1)
        content.rowconfigure(0, weight=1)

        self._build_sidebar(content)
        self._build_editor_area(content)

    # ── Barre latérale ─────────────────────────────────────────────────────────

    def _build_sidebar(self, parent):
        side = tk.Frame(parent, bg=PANEL, width=270, bd=0)
        side.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        side.grid_propagate(False)
        side.columnconfigure(0, weight=1)
        side.rowconfigure(1, weight=1)

        # Titre barre
        tk.Label(side, text="Produits", bg=PANEL, fg=PURPLE,
                 font=("Segoe UI", 12, "bold")).grid(
            row=0, column=0, sticky="ew", padx=10, pady=(12, 6))

        # Liste
        self.tree = ttk.Treeview(side, show="tree", selectmode="browse")
        self.tree.column("#0", width=230)
        self.tree.grid(row=1, column=0, sticky="nsew", padx=(8, 0), pady=4)

        sb = ttk.Scrollbar(side, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb.set)
        sb.grid(row=1, column=1, sticky="ns", pady=4)

        self.tree.bind("<<TreeviewSelect>>", self._on_select)

        # Boutons
        btn_row = tk.Frame(side, bg=PANEL)
        btn_row.grid(row=2, column=0, columnspan=2, sticky="ew", padx=8, pady=(4, 10))
        btn_row.columnconfigure(0, weight=1)
        btn_row.columnconfigure(1, weight=1)

        ttk.Button(btn_row, text="＋  Ajouter",
                   style="Accent.TButton", command=self._add_product).grid(
            row=0, column=0, sticky="ew", padx=(0, 3), ipady=5)
        ttk.Button(btn_row, text="✕  Supprimer",
                   style="Red.TButton", command=self._delete_product).grid(
            row=0, column=1, sticky="ew", padx=(3, 0), ipady=5)

    # ── Zone d'édition ─────────────────────────────────────────────────────────

    def _build_editor_area(self, parent):
        self.editor_area = tk.Frame(parent, bg=PANEL, bd=0)
        self.editor_area.grid(row=0, column=1, sticky="nsew")
        self.editor_area.columnconfigure(0, weight=1)
        self.editor_area.rowconfigure(0, weight=1)

        self.placeholder_lbl = tk.Label(
            self.editor_area,
            text="← Sélectionnez un produit dans la liste",
            bg=PANEL, fg=MUTED, font=("Segoe UI", 13, "italic"))
        self.placeholder_lbl.grid(row=0, column=0)

    def _show_editor(self, product):
        self._loading = True
        # Supprimer l'ancien éditeur
        for w in self.editor_area.winfo_children():
            w.destroy()

        # Canvas scrollable
        canvas = tk.Canvas(self.editor_area, bg=PANEL, highlightthickness=0)
        vsb = ttk.Scrollbar(self.editor_area, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=vsb.set)

        canvas.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        self.editor_area.rowconfigure(0, weight=1)
        self.editor_area.columnconfigure(0, weight=1)

        inner = tk.Frame(canvas, bg=PANEL)
        inner_id = canvas.create_window((0, 0), window=inner, anchor="nw")

        def _on_inner_configure(e):
            canvas.configure(scrollregion=canvas.bbox("all"))

        def _on_canvas_configure(e):
            canvas.itemconfig(inner_id, width=e.width)

        inner.bind("<Configure>", _on_inner_configure)
        canvas.bind("<Configure>", _on_canvas_configure)

        # Molette souris
        def _scroll(e):
            delta = -1 if (e.num == 4 or e.delta > 0) else 1
            canvas.yview_scroll(delta, "units")

        canvas.bind_all("<MouseWheel>", _scroll)
        canvas.bind_all("<Button-4>", _scroll)
        canvas.bind_all("<Button-5>", _scroll)

        inner.columnconfigure(1, weight=1)
        self.option_vars = []
        r = 0

        # ── Identification ──────────────────────────────────────────────────
        r = self._section(inner, "Identification", r)

        self._lbl(inner, "ID / Référence :", r)
        self.var_id = self._entry(inner, r)
        self.var_id.set(product.get("id", ""))
        r += 1

        self._lbl(inner, "Images (séparées par virgule) :", r)
        self.var_images = self._entry(inner, r)
        self.var_images.set(", ".join(product.get("images", [])))
        r += 1

        self._lbl(inner, "Fichier 3D (STEP/GLB) :", r)
        self.var_step = self._step_row(inner, r)
        self.var_step.set(product.get("step", ""))
        r += 1

        tk.Label(inner,
                 text="  ℹ  GLB recommandé (rapide, hors-ligne). Un STEP peut être\n"
                      "     converti en GLB via le bouton « ⇄ Convertir → GLB ».\n"
                      "     Sinon : sous-dossier (ex: models/fichier.glb), lien externe,\n"
                      "     ou < 25 Mo si à la racine.",
                 bg=PANEL, fg=MUTED, font=("Segoe UI", 8, "italic"),
                 justify="left").grid(row=r, column=1, sticky="w", padx=(0, 12), pady=(0, 4))
        r += 1

        # ── Nom ─────────────────────────────────────────────────────────────
        r = self._section(inner, "Nom du produit", r)

        self._lbl(inner, "Nom  FR :", r)
        self.var_name_fr = self._entry(inner, r)
        self.var_name_fr.set(product.get("name", {}).get("fr", ""))
        r += 1

        self._lbl(inner, "Nom  EN :", r)
        self.var_name_en = self._entry(inner, r)
        self.var_name_en.set(product.get("name", {}).get("en", ""))
        r += 1

        self._lbl(inner, "Alt image  FR :", r)
        self.var_alt_fr = self._entry(inner, r)
        self.var_alt_fr.set(product.get("imageAlt", {}).get("fr", ""))
        r += 1

        self._lbl(inner, "Alt image  EN :", r)
        self.var_alt_en = self._entry(inner, r)
        self.var_alt_en.set(product.get("imageAlt", {}).get("en", ""))
        r += 1

        # ── Description ─────────────────────────────────────────────────────
        r = self._section(inner, "Description", r)

        self._lbl(inner, "Description  FR :", r)
        self.txt_desc_fr = self._textbox(inner, r, height=3)
        self.txt_desc_fr.insert("1.0", product.get("description", {}).get("fr", ""))
        r += 1

        self._lbl(inner, "Description  EN :", r)
        self.txt_desc_en = self._textbox(inner, r, height=3)
        self.txt_desc_en.insert("1.0", product.get("description", {}).get("en", ""))
        r += 1

        # ── Options & Prix ──────────────────────────────────────────────────
        r = self._section(inner, "Options & Prix", r)

        for i, opt in enumerate(product.get("options", [])):
            key = opt.get("key", "")
            ov = {}

            # En-tête de l'option : numéro, clé éditable, bouton supprimer
            opt_frame = tk.Frame(inner, bg="#34344e", bd=0)
            opt_frame.grid(row=r, column=0, columnspan=2,
                           sticky="ew", padx=10, pady=(10, 2))
            opt_frame.columnconfigure(1, weight=1)

            tk.Label(opt_frame, text=f"  Option {i + 1}", bg="#34344e", fg=PURPLE,
                     font=("Segoe UI", 10, "bold")).grid(
                row=0, column=0, sticky="w", padx=6, pady=4)

            key_box = tk.Frame(opt_frame, bg="#34344e")
            key_box.grid(row=0, column=1, sticky="w", padx=6)
            tk.Label(key_box, text="clé :", bg="#34344e", fg=MUTED,
                     font=("Segoe UI", 9)).pack(side="left", padx=(0, 4))
            key_var = tk.StringVar(value=key)
            key_var.trace_add("write", lambda *_: self._mark_modified())
            ttk.Entry(key_box, textvariable=key_var, width=14,
                      font=("Segoe UI", 10)).pack(side="left")
            ov["key"] = key_var

            tk.Button(opt_frame, text="✕  Supprimer l'option",
                      bg=RED, fg="white", activebackground=RED_H,
                      activeforeground="white", font=("Segoe UI", 8, "bold"),
                      relief="flat", bd=0, cursor="hand2",
                      command=lambda idx=i: self._remove_option(idx)).grid(
                row=0, column=2, sticky="e", padx=6, pady=4)
            r += 1

            self._lbl(inner, "  Label  FR :", r)
            v = self._entry(inner, r)
            v.set(opt.get("label", {}).get("fr", ""))
            ov["label_fr"] = v
            r += 1

            self._lbl(inner, "  Label  EN :", r)
            v = self._entry(inner, r)
            v.set(opt.get("label", {}).get("en", ""))
            ov["label_en"] = v
            r += 1

            self._lbl(inner, "  Contenu inclus  FR :", r)
            v = self._entry(inner, r)
            v.set(opt.get("includes", {}).get("fr", ""))
            ov["includes_fr"] = v
            r += 1

            self._lbl(inner, "  Contenu inclus  EN :", r)
            v = self._entry(inner, r)
            v.set(opt.get("includes", {}).get("en", ""))
            ov["includes_en"] = v
            r += 1

            self._lbl(inner, "  Prix :", r)
            pv = self._price_row(inner, r, opt.get("price", "0.00$"))
            ov["price"] = pv
            r += 1

            self.option_vars.append(ov)

        # ── Bouton Ajouter une option ────────────────────────────────────────
        add_opt_btn = ttk.Button(
            inner, text="  ＋  Ajouter une option  ",
            style="Green.TButton", command=self._add_option)
        add_opt_btn.grid(row=r, column=0, columnspan=2,
                         sticky="w", padx=14, pady=(10, 4), ipady=4)
        r += 1

        # ── Bouton Appliquer ─────────────────────────────────────────────────
        apply_btn = ttk.Button(
            inner, text="  ✔  Appliquer les modifications  ",
            style="Accent.TButton", command=self._apply_changes)
        apply_btn.grid(row=r, column=0, columnspan=2,
                       sticky="ew", padx=14, pady=(8, 20), ipady=7)

        self._loading = False

    # ── Widgets helpers ────────────────────────────────────────────────────────

    def _section(self, parent, title, row):
        sep = tk.Frame(parent, bg=BORDER, height=1)
        sep.grid(row=row, column=0, columnspan=2, sticky="ew", padx=10, pady=(14, 0))
        row += 1
        tk.Label(parent, text=f"  {title}",
                 bg=PANEL, fg=PURPLE,
                 font=("Segoe UI", 11, "bold")).grid(
            row=row, column=0, columnspan=2, sticky="w", padx=10, pady=(2, 4))
        return row + 1

    def _lbl(self, parent, text, row):
        tk.Label(parent, text=text, bg=PANEL, fg=MUTED,
                 font=("Segoe UI", 9)).grid(
            row=row, column=0, sticky="e", padx=(10, 6), pady=3)

    def _entry(self, parent, row):
        var = tk.StringVar()
        e = ttk.Entry(parent, textvariable=var, font=("Segoe UI", 10))
        e.grid(row=row, column=1, sticky="ew", padx=(0, 12), pady=3)
        var.trace_add("write", lambda *_: self._mark_modified())
        return var

    def _textbox(self, parent, row, height=3):
        frame = tk.Frame(parent, bg=ENTRY_BG, bd=1, relief="flat")
        frame.grid(row=row, column=1, sticky="ew", padx=(0, 12), pady=3)
        t = tk.Text(frame, height=height,
                    font=("Segoe UI", 10),
                    bg=ENTRY_BG, fg=TEXT,
                    insertbackground=TEXT,
                    relief="flat", bd=4, wrap="word")
        t.pack(fill="both", expand=True)
        t.bind("<KeyRelease>", lambda _: self._mark_modified())
        return t

    def _price_row(self, parent, row, price_str):
        raw = price_str.replace("$", "").strip()
        var = tk.StringVar(value=raw)
        var.trace_add("write", lambda *_: self._mark_modified())

        frame = tk.Frame(parent, bg=PANEL)
        frame.grid(row=row, column=1, sticky="w", padx=(0, 12), pady=3)

        entry = ttk.Entry(frame, textvariable=var, width=10,
                          font=("Segoe UI", 12, "bold"))
        entry.pack(side="left")

        tk.Label(frame, text=" $", bg=PANEL, fg=GREEN,
                 font=("Segoe UI", 12, "bold")).pack(side="left", padx=(0, 10))

        def adj(delta):
            try:
                val = float(var.get())
                var.set(f"{max(0.0, val + delta):.2f}")
                self._mark_modified()
            except ValueError:
                pass

        for label, delta in [("−10", -10), ("−5", -5), ("−1", -1),
                              ("+1", 1), ("+5", 5), ("+10", 10)]:
            tk.Button(
                frame, text=label, width=4,
                bg=ENTRY_BG, fg=TEXT,
                activebackground=ACCENT, activeforeground="white",
                font=("Segoe UI", 9), relief="flat", bd=0,
                cursor="hand2",
                command=lambda d=delta: adj(d)
            ).pack(side="left", padx=2)

        return var

    def _step_row(self, parent, row):
        """Champ « Fichier 3D » + boutons Parcourir et Convertir → GLB."""
        var = tk.StringVar()
        var.trace_add("write", lambda *_: self._mark_modified())

        frame = tk.Frame(parent, bg=PANEL)
        frame.grid(row=row, column=1, sticky="ew", padx=(0, 12), pady=3)
        frame.columnconfigure(0, weight=1)

        ttk.Entry(frame, textvariable=var, font=("Segoe UI", 10)).grid(
            row=0, column=0, sticky="ew")

        tk.Button(frame, text="📁  Parcourir", bg=ENTRY_BG, fg=TEXT,
                  activebackground=BORDER, activeforeground="white",
                  font=("Segoe UI", 9), relief="flat", bd=0, cursor="hand2",
                  command=lambda: self._browse_step(var)).grid(
            row=0, column=1, padx=(6, 0))

        self.convert_btn = tk.Button(
            frame, text="⇄  Convertir → GLB", bg=ACCENT, fg="white",
            activebackground=ACCENT_H, activeforeground="white",
            font=("Segoe UI", 9, "bold"), relief="flat", bd=0, cursor="hand2",
            command=self._convert_step_to_glb)
        self.convert_btn.grid(row=0, column=2, padx=(6, 0))

        return var

    def _browse_step(self, var):
        path = filedialog.askopenfilename(
            title="Choisir un fichier 3D",
            initialdir=os.path.join(BASE_DIR, "models"),
            filetypes=[("Modèles 3D", "*.step *.stp *.glb *.gltf"),
                       ("STEP", "*.step *.stp"),
                       ("GLB / glTF", "*.glb *.gltf"),
                       ("Tous les fichiers", "*.*")])
        if not path:
            return
        # Chemin relatif au dossier du site si possible
        try:
            rel = os.path.relpath(path, BASE_DIR)
            if not rel.startswith(".."):
                path = rel.replace(os.sep, "/")
        except ValueError:
            pass
        var.set(path)

    # ── Conversion STEP → GLB ────────────────────────────────────────────────

    def _convert_step_to_glb(self):
        raw = self.var_step.get().strip()
        if not raw:
            messagebox.showwarning(
                "Aucun fichier",
                "Indiquez d'abord un fichier STEP dans le champ « Fichier 3D ».")
            return
        if raw.startswith("http://") or raw.startswith("https://"):
            messagebox.showwarning(
                "Lien externe",
                "La conversion fonctionne uniquement sur un fichier STEP local,\n"
                "pas sur un lien externe.")
            return
        if raw.lower().endswith(".glb"):
            messagebox.showinfo("Déjà en GLB",
                                "Ce fichier est déjà au format GLB.")
            return
        if not raw.lower().endswith((".step", ".stp")):
            messagebox.showwarning(
                "Format non pris en charge",
                "Seuls les fichiers .step / .stp peuvent être convertis en GLB.")
            return

        in_path = raw if os.path.isabs(raw) else os.path.join(BASE_DIR, raw)
        if not os.path.exists(in_path):
            messagebox.showerror(
                "Fichier introuvable",
                f"Le fichier STEP est introuvable :\n  {in_path}")
            return
        if not os.path.exists(CONVERT_SCRIPT):
            messagebox.showerror(
                "Script manquant",
                f"Le script de conversion est introuvable :\n  {CONVERT_SCRIPT}")
            return

        out_rel  = os.path.splitext(raw)[0] + ".glb"
        out_path = os.path.splitext(in_path)[0] + ".glb"

        self._set_convert_running(True)
        self.status_var.set("Conversion STEP → GLB en cours… (peut prendre ~30 s)")

        def worker():
            try:
                proc = subprocess.run(
                    ["node", CONVERT_SCRIPT, in_path, out_path],
                    capture_output=True, text=True, timeout=600)
                self.after(0, lambda: self._on_convert_done(proc, out_rel, out_path))
            except FileNotFoundError:
                self.after(0, lambda: self._on_convert_error(
                    "Node.js est introuvable.\n\n"
                    "Installez-le (ex: sudo apt install nodejs) puis réessayez."))
            except subprocess.TimeoutExpired:
                self.after(0, lambda: self._on_convert_error(
                    "La conversion a dépassé le délai (10 min).\n"
                    "Le fichier STEP est peut-être trop volumineux."))
            except Exception as e:
                self.after(0, lambda: self._on_convert_error(str(e)))

        threading.Thread(target=worker, daemon=True).start()

    def _set_convert_running(self, running):
        if getattr(self, "convert_btn", None) and self.convert_btn.winfo_exists():
            self.convert_btn.config(
                state="disabled" if running else "normal",
                text="⏳  Conversion…" if running else "⇄  Convertir → GLB")

    def _on_convert_done(self, proc, out_rel, out_path):
        self._set_convert_running(False)
        if proc.returncode != 0:
            self.status_var.set("Échec de la conversion")
            messagebox.showerror(
                "Échec de la conversion",
                (proc.stderr or proc.stdout or "Erreur inconnue").strip())
            return
        self.var_step.set(out_rel)
        self._mark_modified()
        try:
            size_mo = os.path.getsize(out_path) / 1048576
        except OSError:
            size_mo = 0
        self.status_var.set(f"GLB créé ({size_mo:.1f} Mo) — pensez à appliquer puis sauvegarder !")
        messagebox.showinfo(
            "Conversion réussie",
            f"Fichier GLB créé :\n  {out_rel}  ({size_mo:.1f} Mo)\n\n"
            "Le champ « Fichier 3D » pointe maintenant sur le GLB.\n"
            "Pensez à « Appliquer » puis « Sauvegarder ».")

    def _on_convert_error(self, message):
        self._set_convert_running(False)
        self.status_var.set("Échec de la conversion")
        messagebox.showerror("Erreur de conversion", message)

    # ── Logique ────────────────────────────────────────────────────────────────

    def _mark_modified(self):
        if self._loading:
            return
        if not self.modified:
            self.modified = True
            self.title("Gestionnaire de Produits  [modifié *]")
            self.status_var.set("Modifications en attente…")

    def _refresh_list(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        for p in self.data["products"]:
            name = p.get("name", {}).get("fr", p.get("id", "?"))
            ref  = p.get("ref", "")
            pcb  = next((o["price"] for o in p.get("options", []) if o["key"] == "pcb"), "?")
            self.tree.insert("", "end",
                             text=f"  {name}\n  {ref}  —  PCB {pcb}",
                             tags=(ref,))

    def _on_select(self, _event):
        sel = self.tree.selection()
        if not sel:
            return
        idx = self.tree.index(sel[0])
        if idx == self.current_idx:
            return

        if self.modified:
            ans = messagebox.askyesnocancel(
                "Modifications non sauvegardées",
                "Des modifications sont en cours.\n"
                "Voulez-vous les appliquer avant de changer de produit ?")
            if ans is True:
                self._apply_changes()
            elif ans is None:
                # Annuler la sélection
                if self.current_idx is not None:
                    items = self.tree.get_children()
                    self.tree.selection_set(items[self.current_idx])
                return

        self.current_idx = idx
        self.modified = False
        self.title("Gestionnaire de Produits")
        self.status_var.set(f"Produit #{idx + 1} sélectionné")
        self._show_editor(self.data["products"][idx])

    @staticmethod
    def _valider_fichier(valeur):
        """Retourne (True, None) si valide, (False, message) si la règle des 25 Mo s'applique."""
        v = valeur.strip()
        if not v:
            return True, None
        is_external = v.startswith("http://") or v.startswith("https://")
        has_folder  = "/" in v or "\\" in v
        if is_external or has_folder:
            return True, None
        return False, (
            f"« {v} » est à la racine du site sans dossier.\n"
            "Ce fichier doit être :\n"
            "  • Dans un sous-dossier  (ex: models/fichier.step)\n"
            "  • Un lien externe  (Google Drive, Dropbox…)\n"
            "  • Ou faire moins de 25 Mo s'il reste à la racine."
        )

    @staticmethod
    def _format_price(raw):
        """Normalise une saisie de prix vers le format « 0.00$ »."""
        raw = (raw or "").strip()
        try:
            return f"{float(raw):.2f}$"
        except ValueError:
            if not raw:
                return "0.00$"
            return raw if raw.endswith("$") else raw + "$"

    def _collect_options(self):
        """Reconstruit la liste des options à partir des champs affichés."""
        options = []
        for i, ov in enumerate(self.option_vars):
            key = ov["key"].get().strip() or f"option{i + 1}"
            options.append({
                "key": key,
                "label": {"fr": ov["label_fr"].get().strip(),
                          "en": ov["label_en"].get().strip()},
                "includes": {"fr": ov["includes_fr"].get().strip(),
                             "en": ov["includes_en"].get().strip()},
                "price": self._format_price(ov["price"].get()),
            })
        return options

    def _collect_into_product(self):
        """Recopie tout le formulaire courant dans le produit en mémoire."""
        if self.current_idx is None:
            return None
        p = self.data["products"][self.current_idx]

        new_id = self.var_id.get().strip()
        p["id"]  = new_id
        p["ref"] = new_id

        images_raw = self.var_images.get()
        p["images"] = [img.strip() for img in images_raw.split(",") if img.strip()]
        p["step"] = self.var_step.get().strip()

        p["name"] = {
            "fr": self.var_name_fr.get().strip(),
            "en": self.var_name_en.get().strip(),
        }
        p["imageAlt"] = {
            "fr": self.var_alt_fr.get().strip(),
            "en": self.var_alt_en.get().strip(),
        }
        p["description"] = {
            "fr": self.txt_desc_fr.get("1.0", "end-1c").strip(),
            "en": self.txt_desc_en.get("1.0", "end-1c").strip(),
        }
        p["options"] = self._collect_options()
        return p

    def _add_option(self):
        p = self._collect_into_product()
        if p is None:
            return
        p.setdefault("options", []).append({
            "key": "",
            "label":    {"fr": "Nouvelle option", "en": "New option"},
            "includes": {"fr": "", "en": ""},
            "price": "0.00$",
        })
        self._show_editor(p)
        self._mark_modified()
        self.status_var.set("Option ajoutée — pensez à appliquer puis sauvegarder !")

    def _remove_option(self, index):
        p = self._collect_into_product()
        if p is None:
            return
        options = p.get("options", [])
        if not (0 <= index < len(options)):
            return
        label = options[index].get("label", {}).get("fr", "") or options[index].get("key", "?")
        if not messagebox.askyesno(
                "Supprimer l'option",
                f"Supprimer l'option :\n\n  « {label} »  ?"):
            return
        options.pop(index)
        self._show_editor(p)
        self._mark_modified()
        self.status_var.set("Option supprimée — pensez à appliquer puis sauvegarder !")

    def _apply_changes(self):
        p = self._collect_into_product()
        if p is None:
            return

        # ── Validation des fichiers ──────────────────────────────────────────
        avertissements = []
        for img in p["images"]:
            ok, msg = self._valider_fichier(img)
            if not ok:
                avertissements.append(msg)
        ok, msg = self._valider_fichier(p["step"])
        if not ok:
            avertissements.append(msg)

        if avertissements:
            messagebox.showwarning(
                "Règle des fichiers — Vérification requise",
                "\n\n".join(avertissements)
            )

        self.modified = False
        self.title("Gestionnaire de Produits")
        self.status_var.set("Modifications appliquées en mémoire — pensez à sauvegarder !")
        self._refresh_list()

    def _add_product(self):
        new_id = simpledialog.askstring(
            "Nouveau produit",
            "Entrez l'ID / référence du nouveau produit\n(ex: MON-PROD-V1) :",
            parent=self)
        if not new_id:
            return
        new_id = new_id.strip().upper()
        if any(p["id"] == new_id for p in self.data["products"]):
            messagebox.showerror("ID existant",
                                 f"L'identifiant « {new_id} » existe déjà.\n"
                                 "Choisissez un ID unique.")
            return

        self.data["products"].append({
            "id":  new_id,
            "ref": new_id,
            "images": ["images/placeholder.jpg"],
            "step": "",
            "imageAlt":    {"fr": "Nouveau produit", "en": "New product"},
            "name":        {"fr": "Nouveau produit", "en": "New product"},
            "description": {"fr": "Description FR.", "en": "Description EN."},
            "options": [
                {"key": "pcb",
                 "label":    {"fr": "PCB Seul", "en": "PCB only"},
                 "includes": {"fr": "Circuit imprimé.", "en": "Bare PCB."},
                 "price": "0.00$"},
                {"key": "kit",
                 "label":    {"fr": "Kit Complet", "en": "Full kit"},
                 "includes": {"fr": "PCB + Composants.", "en": "PCB + components."},
                 "price": "0.00$"},
                {"key": "assembled",
                 "label":    {"fr": "Assemblé", "en": "Assembled"},
                 "includes": {"fr": "Unité assemblée.", "en": "Assembled unit."},
                 "price": "0.00$"},
            ],
        })

        self._refresh_list()
        items = self.tree.get_children()
        self.tree.selection_set(items[-1])
        self.tree.see(items[-1])
        self.current_idx = len(self.data["products"]) - 1
        self.modified = False
        self.status_var.set(f"Nouveau produit « {new_id} » créé")
        self._show_editor(self.data["products"][-1])

    def _delete_product(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("Aucune sélection",
                                   "Sélectionnez d'abord un produit dans la liste.")
            return
        idx  = self.tree.index(sel[0])
        name = self.data["products"][idx].get("name", {}).get("fr", "?")

        if not messagebox.askyesno(
                "Confirmer la suppression",
                f"Supprimer définitivement le produit :\n\n  « {name} »\n\n"
                "Cette action ne peut pas être annulée."):
            return

        self.data["products"].pop(idx)
        self.current_idx = None
        self.modified = False
        self._refresh_list()

        # Afficher placeholder
        for w in self.editor_area.winfo_children():
            w.destroy()
        tk.Label(self.editor_area,
                 text="← Sélectionnez un produit dans la liste",
                 bg=PANEL, fg=MUTED,
                 font=("Segoe UI", 13, "italic")).grid(row=0, column=0)

        self.status_var.set(f"Produit « {name} » supprimé — pensez à sauvegarder !")
        self.title("Gestionnaire de Produits  [modifié *]")

    def _save(self):
        if self.modified:
            ans = messagebox.askyesnocancel(
                "Modifications en attente",
                "Des modifications n'ont pas été appliquées.\n"
                "Les appliquer avant de sauvegarder ?")
            if ans is True:
                self._apply_changes()
            elif ans is None:
                return

        try:
            backup = save_data(self.data)
            self.modified = False
            self.title("Gestionnaire de Produits")
            self.status_var.set("Fichier sauvegardé avec succès ✓")
            messagebox.showinfo(
                "Sauvegarde réussie",
                f"Le fichier produits.json a été mis à jour.\n\n"
                f"Sauvegarde automatique créée :\n  {os.path.basename(backup)}")
        except Exception as e:
            messagebox.showerror("Erreur de sauvegarde", str(e))

    def _on_close(self):
        if self.modified:
            ans = messagebox.askyesnocancel(
                "Quitter",
                "Des modifications non sauvegardées existent.\n"
                "Sauvegarder avant de quitter ?")
            if ans is True:
                self._save()
            elif ans is None:
                return
        self.destroy()


# ─── Point d'entrée ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = ProductManager()
    app.mainloop()
