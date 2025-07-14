class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (t) => {
      t.preventDefault();
      let e = this.closest("cart-items") || this.closest("cart-drawer-items");
      e.updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
  cartUpdateUnsubscriber = void 0;

  constructor() {
    super();

    this.lineItemStatusElement =
      document.getElementById("shopping-cart-line-item-status") ||
      document.getElementById("CartDrawer-LineItemStatus");

    const debouncedValidate = debounce((event) => {
      this.validateQuantity(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener("change", debouncedValidate);
  }

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (t) => {
      if (t.source !== "cart-items") this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) this.cartUpdateUnsubscriber();
  }

  resetQuantityInput(index) {
    let input = this.querySelector(`#Quantity-${index}`);
    input.value = input.getAttribute("value");
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  // ✅ Fix: Proper quantity validation logic
  validateQuantity(event) {
    let input = event.target;
    let quantity = parseInt(input.value);
    let index = input.dataset.index;
    let errorMsg = "";

    const MAX_QTY = 4;
    const MIN_QTY = parseInt(input.dataset.min) || 1;
    const STEP = parseInt(input.step) || 1;

    const cartItem = input.closest(".cart-item, .cart__item");
    const plusButton = cartItem?.querySelector('.quantity__button[name="plus"]');

    // Disable plus button at max
    if (plusButton) {
      plusButton.disabled = quantity >= MAX_QTY;
    }

    // Enable if below max
    if (plusButton && quantity < MAX_QTY) {
      plusButton.disabled = false;
    }

    // Error handling
    if (quantity < MIN_QTY) {
      errorMsg = `Minimum quantity is ${MIN_QTY}`;
    } else if (quantity > MAX_QTY) {
      errorMsg = `Maximum quantity allowed is ${MAX_QTY}`;
      input.value = MAX_QTY;
      quantity = MAX_QTY;
    } else if (quantity % STEP !== 0) {
      errorMsg = `Quantity must be in steps of ${STEP}`;
    }

    if (errorMsg) {
      this.setValidity(event, index, errorMsg);
    } else {
      input.setCustomValidity("");
      input.reportValidity();
      this.updateQuantity(
        index,
        quantity,
        document.activeElement.getAttribute("name"),
        input.dataset.quantityVariantId
      );
    }
  }

  onCartUpdate() {
    const sectionId = this.tagName === "CART-DRAWER-ITEMS" ? "cart-drawer" : "main-cart-items";

    fetch(`${routes.cart_url}?section_id=${sectionId}`)
      .then((res) => res.text())
      .then((html) => {
        let parsed = new DOMParser().parseFromString(html, "text/html");
        if (sectionId === "cart-drawer") {
          ["cart-drawer-items", ".cart-drawer__footer"].forEach((selector) => {
            let existing = document.querySelector(selector);
            let newContent = parsed.querySelector(selector);
            if (existing && newContent) existing.replaceWith(newContent);
          });
        } else {
          let newItems = parsed.querySelector("cart-items");
          this.innerHTML = newItems.innerHTML;
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  getSectionsToRender() {
    return [
      {
        id: "main-cart-items",
        section: document.getElementById("main-cart-items").dataset.id,
        selector: ".js-contents",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
      {
        id: "cart-live-region-text",
        section: "cart-live-region-text",
        selector: ".shopify-section",
      },
      {
        id: "main-cart-footer",
        section: document.getElementById("main-cart-footer").dataset.id,
        selector: ".js-contents",
      },
    ];
  }

  updateQuantity(index, quantity, inputName, variantId) {
    this.enableLoading(index);

    const payload = JSON.stringify({
      line: index,
      quantity,
      sections: this.getSectionsToRender().map((t) => t.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), body: payload })
      .then((res) => res.text())
      .then((responseText) => {
        const result = JSON.parse(responseText);
        const input = document.getElementById(`Quantity-${index}`) || document.getElementById(`Drawer-quantity-${index}`);
        const allItems = document.querySelectorAll(".cart-item");

        if (result.errors) {
          input.value = input.getAttribute("value");
          this.updateLiveRegions(index, result.errors);
          return;
        }

        this.classList.toggle("is-empty", result.item_count === 0);

        const drawer = document.querySelector("cart-drawer");
        const footer = document.getElementById("main-cart-footer");

        if (footer) footer.classList.toggle("is-empty", result.item_count === 0);
        if (drawer) drawer.classList.toggle("is-empty", result.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          let container = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          container.innerHTML = this.getSectionInnerHTML(result.sections[section.section], section.selector);
        });

        let newQty = result.items[index - 1] ? result.items[index - 1].quantity : undefined;
        let errorMsg = "";

        if (allItems.length === result.items.length && newQty !== parseInt(input.value)) {
          errorMsg = typeof newQty === "undefined" ? window.cartStrings.error : window.cartStrings.quantityError.replace("[quantity]", newQty);
        }

        this.updateLiveRegions(index, errorMsg);

        const cartItemElement = document.getElementById(`CartItem-${index}`) || document.getElementById(`CartDrawer-Item-${index}`);
        const focusedElement = cartItemElement?.querySelector(`[name="${inputName}"]`);

        if (focusedElement) {
          if (drawer) {
            trapFocus(drawer, focusedElement);
          } else {
            focusedElement.focus();
          }
        } else if (result.item_count === 0 && drawer) {
          trapFocus(drawer.querySelector(".drawer__inner-empty"), drawer.querySelector("a"));
        } else if (document.querySelector(".cart-item") && drawer) {
          trapFocus(drawer, document.querySelector(".cart-item__name"));
        }

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: "cart-items",
          cartData: result,
          variantId,
        });
      })
      .catch(() => {
        this.querySelectorAll(".loading__spinner").forEach((el) => el.classList.add("hidden"));
        const errorContainer = document.getElementById("cart-errors") || document.getElementById("CartDrawer-CartErrors");
        errorContainer.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(index);
      });
  }

  updateLiveRegions(index, message) {
    let errorRegion = document.getElementById(`Line-item-error-${index}`) || document.getElementById(`CartDrawer-LineItemError-${index}`);
    if (errorRegion) {
      errorRegion.querySelector(".cart-item__error-text").textContent = message;
    }

    this.lineItemStatusElement.setAttribute("aria-hidden", true);

    let liveRegion = document.getElementById("cart-live-region-text") || document.getElementById("CartDrawer-LiveRegionText");

    liveRegion.setAttribute("aria-hidden", false);
    setTimeout(() => {
      liveRegion.setAttribute("aria-hidden", true);
    }, 1000);
  }

  getSectionInnerHTML(htmlString, selector) {
    return new DOMParser().parseFromString(htmlString, "text/html").querySelector(selector).innerHTML;
  }

  enableLoading(index) {
    let section = document.getElementById("main-cart-items") || document.getElementById("CartDrawer-CartItems");
    section.classList.add("cart__items--disabled");

    const spinners = [
      ...this.querySelectorAll(`#CartItem-${index} .loading__spinner`),
      ...this.querySelectorAll(`#CartDrawer-Item-${index} .loading__spinner`)
    ];

    spinners.forEach((spinner) => spinner.classList.remove("hidden"));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute("aria-hidden", false);
  }

  disableLoading(index) {
    let section = document.getElementById("main-cart-items") || document.getElementById("CartDrawer-CartItems");
    section.classList.remove("cart__items--disabled");

    const spinners = [
      ...this.querySelectorAll(`#CartItem-${index} .loading__spinner`),
      ...this.querySelectorAll(`#CartDrawer-Item-${index} .loading__spinner`)
    ];

    spinners.forEach((spinner) => spinner.classList.add("hidden"));
  }
}

customElements.define("cart-items", CartItems);

// Cart Note (if not defined)
if (!customElements.get("cart-note")) {
  customElements.define(
    "cart-note",
    class extends HTMLElement {
      constructor() {
        super();
        this.addEventListener(
          "input",
          debounce((event) => {
            const payload = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), body: payload });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}
