import { mediaQueryLarge, isMobileBreakpoint } from '@theme/utilities';

/**
 * Check if the browser supports interpolate-size CSS property.
 * Safari/iOS doesn't support this, so we need a JS fallback for height animations.
 */
const supportsInterpolateSize = CSS.supports('interpolate-size', 'allow-keywords');

// Accordion
class AccordionCustom extends HTMLElement {
  /** @type {HTMLDetailsElement} */
  get details() {
    const details = this.querySelector('details');

    if (!(details instanceof HTMLDetailsElement)) throw new Error('Details element not found');

    return details;
  }

  /** @type {HTMLElement} */
  get summary() {
    const summary = this.details.querySelector('summary');

    if (!(summary instanceof HTMLElement)) throw new Error('Summary element not found');

    return summary;
  }

  /** @type {HTMLElement | null} */
  get content() {
    return this.details.querySelector('.details-content');
  }

  get #disableOnMobile() {
    return this.dataset.disableOnMobile === 'true';
  }

  get #disableOnDesktop() {
    return this.dataset.disableOnDesktop === 'true';
  }

  get #closeWithEscape() {
    return this.dataset.closeWithEscape === 'true';
  }

  #controller = new AbortController();
  /** @type {Animation | null} */
  #animation = null;

  connectedCallback() {
    const { signal } = this.#controller;

    this.#setDefaultOpenState();

    this.addEventListener('keydown', this.#handleKeyDown, { signal });
    this.summary.addEventListener('click', this.handleClick, { signal });
    mediaQueryLarge.addEventListener('change', this.#handleMediaQueryChange, { signal });
  }

  /**
   * Handles the disconnect event.
   */
  disconnectedCallback() {
    // Disconnect all the event listeners
    this.#controller.abort();
    if (this.#animation) {
      this.#animation.cancel();
      this.#animation = null;
    }
  }

  /**
   * Handles the click event.
   * @param {Event} event - The event.
   */
  handleClick = (event) => {
    const isMobile = isMobileBreakpoint();
    const isDesktop = !isMobile;

    // Stop default behaviour from the browser
    if ((isMobile && this.#disableOnMobile) || (isDesktop && this.#disableOnDesktop)) {
      event.preventDefault();
      return;
    }

    // For browsers that support interpolate-size (Chrome), use native behavior
    if (supportsInterpolateSize) {
      // Exclusive behavior: Close siblings
      if (!this.details.open) {
        this.#closeSiblings();
      }
      return;
    }

    // For Safari/iOS: intercept and animate manually
    event.preventDefault();

    if (this.details.open) {
      this.#animateClose();
    } else {
      this.#closeSiblings();
      this.#animateOpen();
    }
  };

  /**
   * Close sibling accordions (exclusive behavior)
   */
  #closeSiblings() {
    const parent = this.parentElement;
    if (parent) {
      const siblings = parent.querySelectorAll('accordion-custom');
      for (const sibling of siblings) {
        if (sibling !== this && sibling instanceof AccordionCustom && sibling.details.open) {
          if (supportsInterpolateSize) {
            sibling.details.open = false;
          } else {
            sibling.#animateClose();
          }
        }
      }
    }
  }

  /**
   * Animate accordion opening (Safari/iOS fallback)
   */
  #animateOpen() {
    const content = this.content;
    if (!content) return;

    // Cancel any running animation
    if (this.#animation) {
      this.#animation.cancel();
    }

    // First, set the details to open so content is rendered
    this.details.open = true;

    // Get the target height
    const endHeight = content.scrollHeight;

    // Start animation from 0
    this.#animation = content.animate(
      [
        { maxHeight: '0px', opacity: 0 },
        { maxHeight: `${endHeight}px`, opacity: 1 },
      ],
      {
        duration: 200,
        easing: 'ease-out',
        fill: 'forwards',
      }
    );

    this.#animation.onfinish = () => {
      // Set final CSS values
      content.style.maxHeight = '';
      content.style.opacity = '';
      this.#animation = null;
    };

    this.#animation.oncancel = () => {
      this.#animation = null;
    };
  }

  /**
   * Animate accordion closing (Safari/iOS fallback)
   */
  #animateClose() {
    const content = this.content;
    if (!content) return;

    // Cancel any running animation
    if (this.#animation) {
      this.#animation.cancel();
    }

    // Get current height
    const startHeight = content.scrollHeight;

    // Animate to closed
    this.#animation = content.animate(
      [
        { maxHeight: `${startHeight}px`, opacity: 1 },
        { maxHeight: '0px', opacity: 0 },
      ],
      {
        duration: 200,
        easing: 'ease-out',
        fill: 'forwards',
      }
    );

    this.#animation.onfinish = () => {
      // Now actually close the details
      this.details.open = false;
      // Reset styles
      content.style.maxHeight = '';
      content.style.opacity = '';
      this.#animation = null;
    };

    this.#animation.oncancel = () => {
      this.#animation = null;
    };
  }

  /**
   * Handles the media query change event.
   */
  #handleMediaQueryChange = () => {
    this.#setDefaultOpenState();
  };

  /**
   * Sets the default open state of the accordion based on the `open-by-default-on-mobile` and `open-by-default-on-desktop` attributes.
   */
  #setDefaultOpenState() {
    const isMobile = isMobileBreakpoint();

    this.details.open =
      (isMobile && this.hasAttribute('open-by-default-on-mobile')) ||
      (!isMobile && this.hasAttribute('open-by-default-on-desktop'));
  }

  /**
   * Handles keydown events for the accordion
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #handleKeyDown(event) {
    // Close the accordion when used as a menu
    if (event.key === 'Escape' && this.#closeWithEscape) {
      event.preventDefault();

      if (supportsInterpolateSize) {
        this.details.open = false;
      } else {
        this.#animateClose();
      }
      this.summary.focus();
    }
  }
}

if (!customElements.get('accordion-custom')) {
  customElements.define('accordion-custom', AccordionCustom);
}
