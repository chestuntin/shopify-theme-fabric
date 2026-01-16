/**
 * Circular Scroll Progress Indicator
 * Shows scroll progress with toggle between scroll-down and scroll-to-top functionality
 */

class ScrollIndicator {
    /**
     * @param {HTMLElement} element - The scroll indicator element
     */
    constructor(element) {
        this.element = element;
        /** @type {SVGCircleElement | null} */
        this.progressCircle = element.querySelector('.scroll-indicator__circle-progress');
        /** @type {SVGGElement | null} */
        this.arrow = element.querySelector('.scroll-indicator__arrow');
        this.radius = 20; // Must match the SVG circle radius
        this.circumference = 2 * Math.PI * this.radius;
        this.isAtBottom = false; // Track if user is at bottom (95%+)

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

        // Check if at bottom (95% or more)
        const wasAtBottom = this.isAtBottom;
        this.isAtBottom = progress >= 0.95;

        // Toggle arrow direction when state changes
        if (this.isAtBottom !== wasAtBottom) {
            if (this.isAtBottom) {
                // Add class to rotate arrow up
                this.element.classList.add('scroll-indicator--at-bottom');
            } else {
                // Remove class to rotate arrow down
                this.element.classList.remove('scroll-indicator--at-bottom');
            }
        }

        // Fade out starting at 60% scroll, fully faded by 75%
        let opacity = 1;
        if (progress >= 0.60) {
            // Map 0.60-0.75 to 1.0-0.0
            opacity = 1 - ((progress - 0.60) / 0.15);
            opacity = Math.max(0, Math.min(1, opacity));
        }

        this.element.style.opacity = `${opacity}`;
        this.element.style.pointerEvents = opacity > 0 ? 'auto' : 'none';
    }

    handleClick() {
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = documentHeight - viewportHeight;

        if (this.isAtBottom) {
            // Scroll to top of page
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            // Scroll to bottom of page
            window.scrollTo({
                top: maxScroll,
                behavior: 'smooth'
            });
        }
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
