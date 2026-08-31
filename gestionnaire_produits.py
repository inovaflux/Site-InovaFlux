#!/usr/bin/env python3
"""
Gestionnaire de Produits — Site V2.2
Interface graphique pour modifier, ajouter et ajuster les produits et prix
du fichier produits.json sans éditer le fichier manuellement.
"""

import json
import os
import shutil
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
from datetime import datetime

JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "produits.json")

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

        self.option_frames = []
        self.option_vars = []

        opts_frame = tk.Frame(inner, bg=PANEL)
        opts_frame.grid(row=r, column=0, columnspan=2, sticky="ew", padx=10, pady=4)
        r += 1

        for opt in product.get("options", []):
            self._add_option_block(opts_frame, opt)

        add_opt_btn = ttk.Button(
            inner, text="  ＋  Ajouter une version / option  ",
            style="Green.TButton",
            command=lambda: self._add_option_block(opts_frame))
        add_opt_btn.grid(row=r, column=0, columnspan=2,
                         sticky="w", padx=14, pady=(8, 2), ipady=4)
        r += 1

        # ── Bouton Appliquer ─────────────────────────────────────────────────
        r += 1
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
        frame = tk.Frame(parent, bg=PANEL)
        frame.grid(row=row, column=1, sticky="w", padx=(0, 12), pady=3)
        return self._build_price_controls(frame, price_str)

    def _build_price_controls(self, frame, price_str):
        raw = price_str.replace("$", "").strip()
        var = tk.StringVar(value=raw)
        var.trace_add("write", lambda *_: self._mark_modified())

        entry = ttk.Entry(frame, textvariable=var, width=10,
                          font=("Segoe UI", 12, "bold"))
        entry.pack(side="left")

        tk.Label(frame, text=" $", bg=frame["bg"], fg=GREEN,
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

    def _add_option_block(self, parent, opt=None):
        key = opt.get("key", "") if opt else ""
        block = tk.Frame(parent, bg="#34344e", bd=0)
        block.pack(fill="x", pady=4)
        block.columnconfigure(1, weight=1)

        # En-tête de la version (nom modifiable = clé)
        head = tk.Frame(block, bg="#34344e")
        head.grid(row=0, column=0, columnspan=2, sticky="ew")
        head.columnconfigure(1, weight=1)
        tk.Label(head,
                 text="  Version :",
                 bg="#34344e", fg=PURPLE,
                 font=("Segoe UI", 10, "bold")).grid(
            row=0, column=0, sticky="w", padx=(8, 4), pady=4)
        key_var = tk.StringVar(value=key)
        key_entry = ttk.Entry(head, textvariable=key_var,
                              font=("Segoe UI", 10, "bold"))
        key_entry.grid(row=0, column=1, sticky="ew", padx=(0, 6), pady=4)
        key_var.trace_add("write", lambda *_: self._mark_modified())
        tk.Button(
            head, text="✕", width=3,
            bg=RED, fg="white",
            activebackground=RED_H, activeforeground="white",
            relief="flat", bd=0, cursor="hand2",
            command=lambda: self._remove_option_block(block)
        ).grid(row=0, column=2, padx=(4, 6), pady=3)

        ov = {}
        row = 1

        def make_lbl(text, rr):
            tk.Label(block, text=text, bg="#34344e", fg=MUTED,
                     font=("Segoe UI", 9)).grid(
                row=rr, column=0, sticky="e", padx=(8, 6), pady=3)

        def make_entry(rr, initial=""):
            var = tk.StringVar()
            e = ttk.Entry(block, textvariable=var, font=("Segoe UI", 10))
            e.grid(row=rr, column=1, sticky="ew", padx=(0, 8), pady=3)
            var.trace_add("write", lambda *_: self._mark_modified())
            var.set(initial)
            return var

        make_lbl("  Label  FR :", row)
        ov["label_fr"] = make_entry(row, opt.get("label", {}).get("fr", "") if opt else "")
        row += 1

        make_lbl("  Label  EN :", row)
        ov["label_en"] = make_entry(row, opt.get("label", {}).get("en", "") if opt else "")
        row += 1

        make_lbl("  Contenu inclus  FR :", row)
        ov["includes_fr"] = make_entry(row, opt.get("includes", {}).get("fr", "") if opt else "")
        row += 1

        make_lbl("  Contenu inclus  EN :", row)
        ov["includes_en"] = make_entry(row, opt.get("includes", {}).get("en", "") if opt else "")
        row += 1

        make_lbl("  Prix :", row)
        price_frame = tk.Frame(block, bg="#34344e")
        price_frame.grid(row=row, column=1, sticky="w", padx=(0, 8), pady=3)
        ov["price"] = self._build_price_controls(
            price_frame, opt.get("price", "0.00$") if opt else "0.00$")
        row += 1

        ov["key_var"] = key_var
        self.option_vars.append(ov)
        self.option_frames.append(block)
        self._mark_modified()

    def _remove_option_block(self, block):
        if len(self.option_frames) <= 1:
            messagebox.showwarning(
                "Suppression impossible",
                "Un produit doit garder au moins une version / option.")
            return
        idx = self.option_frames.index(block)
        block.destroy()
        self.option_frames.pop(idx)
        self.option_vars.pop(idx)
        self._mark_modified()

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

    def _apply_changes(self):
        if self.current_idx is None:
            return
        p = self.data["products"][self.current_idx]

        new_id = self.var_id.get().strip()
        p["id"]  = new_id
        p["ref"] = new_id

        images_raw = self.var_images.get()
        p["images"] = [img.strip() for img in images_raw.split(",") if img.strip()]

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

        new_options = []
        for i, ov in enumerate(self.option_vars):
            key = ov["key_var"].get().strip()
            if not key:
                key = ov["label_fr"].get().strip() or f"option{i + 1}"
            opt = {
                "key":      key,
                "label":    {"fr": ov["label_fr"].get().strip(),
                             "en": ov["label_en"].get().strip()},
                "includes": {"fr": ov["includes_fr"].get().strip(),
                             "en": ov["includes_en"].get().strip()},
                "price":    "0.00$",
            }
            try:
                opt["price"] = f"{float(ov['price'].get()):.2f}$"
            except ValueError:
                pass
            new_options.append(opt)
        p["options"] = new_options

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
