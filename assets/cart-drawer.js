class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener("keyup", (e) => {
      if (e.code === "Escape") this.close();
    });

    this.querySelector("#CartDrawer-Overlay").addEventListener("click", this.close.bind(this));

    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    let icon = document.querySelector("#cart-icon-bubble");

    if (icon) {
      icon.setAttribute("role", "button");
      icon.setAttribute("aria-haspopup", "dialog");

      icon.addEventListener("click", (e) => {
        e.preventDefault();
        this.open(icon);
      });

      icon.addEventListener("keydown", (e) => {
        if (e.code.toUpperCase() === "SPACE") {
          e.preventDefault();
          this.open(icon);
        }
      });
    }
  }

  open(triggerElement) {
    if (triggerElement) {
      this.setActiveElement(triggerElement);
    }

    let detailsToggle = this.querySelector('[id^="Details-"] summary');
    if (detailsToggle && !detailsToggle.hasAttribute("role")) {
      this.setSummaryAccessibility(detailsToggle);
    }

    setTimeout(() => {
      this.classList.add("animate", "active");
    });

    this.addEventListener("transitionend", () => {
      let container = this.classList.contains("is-empty")
        ? this.querySelector(".drawer__inner-empty")
        : document.getElementById("CartDrawer");

      let trapElement = this.querySelector(".drawer__inner") || this.querySelector(".drawer__close");
      trapFocus(container, trapElement);
    }, { once: true });

    document.body.classList.add("overflow-hidden");
  }

  close() {
    this.classList.remove("active");
    removeTrapFocus(this.activeElement);
    document.body.classList.remove("overflow-hidden");
  }

  setSummaryAccessibility(summary) {
    summary.setAttribute("role", "button");
    summary.setAttribute("aria-expanded", "false");

    if (summary.nextElementSibling.getAttribute("id")) {
      summary.setAttribute("aria-controls", summary.nextElementSibling.id);
    }

    summary.addEventListener("click", (e) => {
      const isOpen = e.currentTarget.closest("details").hasAttribute("open");
      e.currentTarget.setAttribute("aria-expanded", !isOpen);
    });

    summary.parentElement.addEventListener("keyup", onKeyUpEscape);
  }

  renderContents(parsedSectionData) {
    if (this.querySelector(".drawer__inner").classList.contains("is-empty")) {
      this.querySelector(".drawer__inner").classList.remove("is-empty");
    }

    this.productId = parsedSectionData.id;

    this.getSectionsToRender().forEach((section) => {
      let container = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (container) {
        container.innerHTML = this.getSectionInnerHTML(parsedSectionData.sections[section.id], section.selector);
      }
    });

    setTimeout(() => {
      this.querySelector("#CartDrawer-Overlay").addEventListener("click", this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      { id: "cart-drawer", selector: "#CartDrawer" },
      { id: "cart-icon-bubble" }
    ];
  }

  getSectionDOM(html, selector = ".shopify-section") {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-drawer", CartDrawer);

// -------- CartDrawerItems --------

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: "CartDrawer",
        section: "cart-drawer",
        selector: ".drawer__inner"
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section"
      }
    ];
  }
}

customElements.define("cart-drawer-items", CartDrawerItems);
