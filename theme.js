/* Mode sombre partagé — InovaFlux
   - Applique le thème immédiatement (évite le flash clair au chargement)
   - Mémorise le choix dans localStorage
   - Injecte un bouton bascule dans la barre de navigation
   - Au premier passage, suit la préférence système (clair/sombre) */
(function () {
    var KEY = 'inovaflux-theme';
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}

    var prefersDark = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    var btn = null;

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function updateBtn() {
        if (!btn) return;
        btn.textContent = isDark() ? '☀' : '🌙';
        btn.title = isDark() ? 'Passer en mode clair' : 'Passer en mode sombre';
        btn.setAttribute('aria-label', btn.title);
    }

    function setTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem(KEY, t); } catch (e) {}
        updateBtn();
    }

    function inject() {
        btn = document.createElement('button');
        btn.className = 'theme-toggle';
        btn.type = 'button';
        btn.addEventListener('click', function () {
            setTheme(isDark() ? 'light' : 'dark');
        });
        var nav = document.querySelector('.nav-top');
        if (nav) {
            nav.appendChild(btn);
        } else {
            btn.classList.add('theme-toggle--float');
            document.body.appendChild(btn);
        }
        updateBtn();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
