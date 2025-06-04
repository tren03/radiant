class MainNavbar extends HTMLElement {
    connectedCallback() {
        fetch('/src/navbar.html')
            .then(res => res.text())
            .then(html => {
                this.innerHTML = html;

                // Reattach the mobile toggle button logic after HTML is injected
                this.querySelector('#menu-toggle')?.addEventListener('click', () => {
                    const menu = this.querySelector('#mobile-menu');
                    menu.classList.toggle('hidden');
                });
            });
    }
}

customElements.define('main-navbar', MainNavbar);