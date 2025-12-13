import { calculateHeaderGroupHeight } from "@theme/critical";
import { Component } from "@theme/component";
import {
  onDocumentLoaded,
  changeMetaThemeColor,
  debounce,
  throttle,
} from "@theme/utilities";

/**
 * @typedef {Object} HeaderComponentRefs
 * @property {HTMLDivElement} headerDrawerContainer - The header drawer container element
 * @property {HTMLElement} headerMenu - The header menu element
 * @property {HTMLElement} headerRowTop - The header top row element
 */

/**
 * @typedef {CustomEvent<{ minimumReached: boolean }>} OverflowMinimumEvent
 */

/**
 * A custom element that manages the site header.
 *
 * @extends {Component<HeaderComponentRefs>}
 */

class HeaderComponent extends Component {
  requiredRefs = ["headerDrawerContainer", "headerMenu", "headerRowTop"];

  /**
   * Width of window when header drawer was hidden
   * @type {number | null}
   */
  #menuDrawerHiddenWidth = null;

  /**
   * An intersection observer for monitoring sticky header position
   * @type {IntersectionObserver | null}
   */
  #intersectionObserver = null;

  /**
   * Whether the header has been scrolled offscreen, when sticky behavior is 'scroll-up'
   * @type {boolean}
   */
  #offscreen = false;

  /**
   * The last recorded scrollTop of the document, when sticky behavior is 'scroll-up
   * @type {number}
   */
  #lastScrollTop = 0;

  /**
   * A timeout to allow for hiding animation, when sticky behavior is 'scroll-up'
   * @type {number | null}
   */
  #timeout = null;

  /**
   * The duration to wait for hiding animation, when sticky behavior is 'scroll-up'
   * @constant {number}
   */
  #animationDelay = 150;

  /**
   * Whether we're on iOS Safari specifically (not Chrome on iOS)
   * @type {boolean}
   */
  #isIOSSafari = false;

  /**
   * RequestAnimationFrame ID for Safari iOS state updates
   * @type {number | null}
   */
  #safariIntersectionTimeout = null;

  /**
   * Keeps the global `--header-height` custom property up to date,
   * which other theme components can then consume
   */
  #resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return;

    const { height } = entry.target.getBoundingClientRect();
    document.body.style.setProperty("--header-height", `${height}px`);

    // Check if the menu drawer should be hidden in favor of the header menu
    if (
      this.#menuDrawerHiddenWidth &&
      window.innerWidth > this.#menuDrawerHiddenWidth
    ) {
      this.#updateMenuVisibility(false);
    }
  });

  /**
   * Handles intersection observer entry updates
   * @param {IntersectionObserverEntry} entry
   * @param {boolean} alwaysSticky
   */
  #handleIntersectionUpdate = (entry, alwaysSticky) => {
    if (!entry) return;

    const { isIntersecting } = entry;

    if (alwaysSticky) {
      // On Safari iOS, completely ignore intersection observer for state management
      // The scroll handler will manage state instead to avoid rapid toggling
      if (this.#isIOSSafari) {
        return;
      }

      const newState = isIntersecting ? "inactive" : "active";
      this.dataset.stickyState = newState;
      changeMetaThemeColor(this.refs.headerRowTop);
    } else {
      this.#offscreen =
        !isIntersecting || this.dataset.stickyState === "active";
    }
  };

  /**
   * Observes the header while scrolling the viewport to track when its actively sticky
   * @param {Boolean} alwaysSticky - Determines if we need to observe when the header is offscreen
   */
  #observeStickyPosition = (alwaysSticky = true) => {
    if (this.#intersectionObserver) return;

    const config = {
      // Use 0.95 instead of 1.0 to prevent oscillation at the boundary
      // This gives a 5% buffer to prevent rapid toggling during momentum scrolling
      threshold: alwaysSticky ? 0.95 : 0,
    };

    /** @type {(entries: IntersectionObserverEntry[]) => void} */
    const intersectionCallback = (entries) => {
      const entry = entries?.[0];
      if (entry) {
        this.#handleIntersectionUpdate(entry, alwaysSticky);
      }
    };

    // IntersectionObserver callback receives an array of entries
    // Type definition is incorrect, actual API uses array
    this.#intersectionObserver = new IntersectionObserver(
      /** @type {any} */ (intersectionCallback),
      config
    );

    this.#intersectionObserver.observe(this);
  };

  /**
   * Handles the overflow minimum event from the header menu
   * @param {OverflowMinimumEvent} event
   */
  #handleOverflowMinimum = (event) => {
    this.#updateMenuVisibility(event.detail.minimumReached);
  };

  /**
   * Updates the visibility of the menu and drawer
   * @param {boolean} hideMenu - Whether to hide the menu and show the drawer
   */
  #updateMenuVisibility(hideMenu) {
    if (hideMenu) {
      this.refs.headerDrawerContainer.classList.remove("desktop:hidden");
      this.#menuDrawerHiddenWidth = window.innerWidth;
      this.refs.headerMenu.classList.add("hidden");
    } else {
      this.refs.headerDrawerContainer.classList.add("desktop:hidden");
      this.#menuDrawerHiddenWidth = null;
      this.refs.headerMenu.classList.remove("hidden");
    }
  }

  #handleWindowScroll = () => {
    const stickyMode = this.getAttribute("sticky");
    if (!this.#offscreen && stickyMode !== "always") return;

    const scrollTop = document.scrollingElement?.scrollTop ?? 0;
    const isScrollingUp = scrollTop < this.#lastScrollTop;
    if (this.#timeout) {
      clearTimeout(this.#timeout);
      this.#timeout = null;
    }

    if (stickyMode === "always") {
      const isAtTop = this.getBoundingClientRect().top >= 0;

      // On Safari iOS, scroll handler manages state (intersection observer is bypassed)
      if (this.#isIOSSafari) {
        // Use a threshold buffer to prevent oscillation - within 5px of top = "at top"
        // This prevents rapid toggling during momentum scrolling
        const headerTop = this.getBoundingClientRect().top;
        const scrollTopNow = document.scrollingElement?.scrollTop ?? 0;
        const isAtTopWithThreshold = headerTop >= -5 && scrollTopNow <= 5;
        const newState = isAtTopWithThreshold ? "inactive" : "active";

        // Use requestAnimationFrame to batch updates and prevent rapid toggling
        if (this.#safariIntersectionTimeout === null) {
          this.#safariIntersectionTimeout = requestAnimationFrame(() => {
            this.#safariIntersectionTimeout = null;
            // Double-check with threshold to prevent false positives
            const currentHeaderTop = this.getBoundingClientRect().top;
            const currentScrollTop = document.scrollingElement?.scrollTop ?? 0;
            const currentIsAtTop =
              currentHeaderTop >= -5 && currentScrollTop <= 5;
            const currentNewState = currentIsAtTop ? "inactive" : "active";
            if (this.dataset.stickyState !== currentNewState) {
              this.dataset.stickyState = currentNewState;
              changeMetaThemeColor(this.refs.headerRowTop);
            }
          });
        }
      }

      if (isAtTop) {
        this.dataset.scrollDirection = "none";
      } else if (isScrollingUp) {
        this.dataset.scrollDirection = "up";
      } else {
        this.dataset.scrollDirection = "down";
      }

      this.#lastScrollTop = scrollTop;
      return;
    }

    if (isScrollingUp) {
      this.removeAttribute("data-animating");

      const isAtTop = this.getBoundingClientRect().top >= 0;

      if (isAtTop) {
        // reset sticky state when header is scrolled up to natural position
        this.#offscreen = false;
        this.dataset.stickyState = "inactive";
        this.dataset.scrollDirection = "none";
      } else {
        // show sticky header when scrolling up
        this.dataset.stickyState = "active";
        this.dataset.scrollDirection = "up";
      }
    } else if (this.dataset.stickyState === "active") {
      this.dataset.scrollDirection = "none";
      // delay transitioning to idle hidden state for hiding animation
      this.setAttribute("data-animating", "");

      this.#timeout = setTimeout(() => {
        this.dataset.stickyState = "idle";
        this.removeAttribute("data-animating");
      }, this.#animationDelay);
    } else {
      this.dataset.scrollDirection = "none";
      this.dataset.stickyState = "idle";
    }

    this.#lastScrollTop = scrollTop;
  };

  connectedCallback() {
    super.connectedCallback();
    this.#resizeObserver.observe(this);
    this.addEventListener("overflowMinimum", this.#handleOverflowMinimum);

    // Detect iOS Safari specifically (not Chrome on iOS)
    const userAgent = navigator.userAgent;
    // @ts-expect-error - MSStream is a legacy IE property not in Window type
    const hasMSStream = window.MSStream;
    const isIOS = /iPhone|iPad|iPod/.test(userAgent) && !hasMSStream;
    // Only apply Safari-specific fixes, not Chrome on iOS
    this.#isIOSSafari =
      isIOS && /Safari/.test(userAgent) && !/CriOS|FxiOS/.test(userAgent);

    const stickyMode = this.getAttribute("sticky");
    if (stickyMode) {
      this.#observeStickyPosition(stickyMode === "always");

      if (stickyMode === "scroll-up" || stickyMode === "always") {
        document.addEventListener("scroll", this.#handleWindowScroll);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resizeObserver.disconnect();
    this.#intersectionObserver?.disconnect();
    this.removeEventListener("overflowMinimum", this.#handleOverflowMinimum);
    document.removeEventListener("scroll", this.#handleWindowScroll);
    if (this.#timeout) {
      clearTimeout(this.#timeout);
      this.#timeout = null;
    }
    if (this.#safariIntersectionTimeout !== null) {
      cancelAnimationFrame(this.#safariIntersectionTimeout);
      this.#safariIntersectionTimeout = null;
    }
    document.body.style.setProperty("--header-height", "0px");
  }
}

if (!customElements.get("header-component")) {
  customElements.define("header-component", HeaderComponent);
}

onDocumentLoaded(() => {
  const header = document.querySelector("#header-component");
  const headerGroup = document.querySelector("#header-group");

  // Update header group height on resize of any child
  if (headerGroup) {
    const resizeObserver = new ResizeObserver(() =>
      calculateHeaderGroupHeight(header, headerGroup)
    );

    // Observe all children of the header group
    const children = headerGroup.children;
    for (let i = 0; i < children.length; i++) {
      const element = children[i];
      if (element === header || !(element instanceof HTMLElement)) continue;
      resizeObserver.observe(element);
    }

    // Also observe the header group itself for child changes
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // Re-observe all children when the list changes
          const children = headerGroup.children;
          for (let i = 0; i < children.length; i++) {
            const element = children[i];
            if (element === header || !(element instanceof HTMLElement))
              continue;
            resizeObserver.observe(element);
          }
        }
      }
    });

    mutationObserver.observe(headerGroup, { childList: true });
  }
});
