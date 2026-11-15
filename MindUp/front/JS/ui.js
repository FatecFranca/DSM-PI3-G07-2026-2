(function () {
    const header = document.querySelector('.header');
    const toggle = document.querySelector('[data-menu-toggle]');
    const menu = document.getElementById('menu-principal');

    if (!header || !toggle || !menu) return;

    function setOpen(open) {
        header.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }

    function isOpen() {
        return header.classList.contains('is-open');
    }

    toggle.addEventListener('click', function () {
        setOpen(!isOpen());
    });

    menu.addEventListener('click', function (event) {
        if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && isOpen()) {
            setOpen(false);
            toggle.focus();
        }
    });

    document.addEventListener('click', function (event) {
        if (isOpen() && !header.contains(event.target)) setOpen(false);
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) setOpen(false);
    });
})();
