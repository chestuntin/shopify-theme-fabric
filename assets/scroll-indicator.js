/**
 * Circular Scroll Progress Indicator
 * Shows scroll progress through the hero section with an animated SVG ring
 */

class ScrollIndicator {
    /**
     * @param {HTMLElement} element - The scroll indicator element
     */
    constructor(element) {
        this.element = element;
        /** @type {SVGCircleElement | null} */
        this.progressCircle = element.querySelector('.scroll-indicator__circle-progress');
        this.radius = 20; // Must match the SVG circle radius
        this.circumference = 2 * Math.PI * this.radius;

        // Initialize the circle
        if (this.progressCircle) {
            this.progressCircle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
            this.progressCircle.style.strokeDashoffset = `${this.circumference}`;
        }

        // Bind methods
        this.handleScroll = this.handleScroll.bind(this);
        this.handleClick = this.handleClick.bind(this);

        // Set up event listeners
        this.init();
    }

    init() {
        // Add click handler for smooth scroll
        this.element.addEventListener('click', this.handleClick);

        // Add scroll handler with passive flag for performance
        window.addEventListener('scroll', this.handleScroll, { passive: true });

        // Initial call to set correct state
        this.handleScroll();
    }

    handleScroll() {
        // Calculate scroll progress based on entire page height
        const scrollY = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;

        // Maximum scrollable distance (total height minus viewport)
        const maxScroll = documentHeight - viewportHeight;

        // Progress fills completely when user reaches bottom of page
        // Clamp between 0 and 1 to ensure accurate tracking
        const progress = maxScroll > 0 ? Math.max(0, Math.min(scrollY / maxScroll, 1)) : 0;

        // Update circle progress
        const offset = this.circumference - (progress * this.circumference);
        if (this.progressCircle) {
            this.progressCircle.style.strokeDashoffset = `${offset}`;
        }

        // Keep indicator always visible (no fade-out)
        this.element.style.opacity = '1';
        this.element.style.pointerEvents = 'auto';
    }

    handleClick() {
        // Smooth scroll to bottom of page
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = documentHeight - viewportHeight;

        window.scrollTo({
            top: maxScroll,
            behavior: 'smooth'
        });
    }

    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
        this.element.removeEventListener('click', this.handleClick);
    }
}

// Initialize the scroll indicator when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollIndicator);
} else {
    initScrollIndicator();
}

function initScrollIndicator() {
    const indicatorElement = document.getElementById('scrollIndicator');
    if (indicatorElement) {
        new ScrollIndicator(indicatorElement);
    }
}
