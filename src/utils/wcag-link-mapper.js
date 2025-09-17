const fs = require('fs');
const path = require('path');
const config = require('../core/config');

/**
 * WCAG Link Mapper
 * Maps axe-core rule tags to WCAG Success Criteria and provides W3C documentation links
 */
class WcagLinkMapper {
    constructor() {
        this.wcagData = null;
        this.successCriteriaLookup = new Map();
        this.loadWcagData();
    }

    /**
     * Load and parse WCAG JSON data
     */
    loadWcagData() {
        try {
            const wcagJson = fs.readFileSync(config.WCAG_DATA_FILE, 'utf-8');
            this.wcagData = JSON.parse(wcagJson);
            this.buildLookupMap();
        } catch (error) {
            console.error('Error loading WCAG data:', error.message);
            console.warn('W3C documentation links will not be available');
        }
    }

    /**
     * Build a lookup map for fast Success Criteria access
     */
    buildLookupMap() {
        if (!this.wcagData) return;

        this.wcagData.forEach(principle => {
            principle.guidelines.forEach(guideline => {
                guideline.success_criteria.forEach(criterion => {
                    this.successCriteriaLookup.set(criterion.ref_id, criterion);
                });
            });
        });
    }

    /**
     * Extract WCAG Success Criteria reference IDs from axe-core tags
     * @param {string[]} tags - Array of axe-core tags
     * @returns {string[]} Array of WCAG Success Criteria IDs (e.g., ['2.4.4', '4.1.2'])
     */
    extractWcagCriteriaFromTags(tags) {
        const wcagTags = tags.filter(tag => tag.startsWith('wcag') && /^wcag\d+$/.test(tag));
        
        return wcagTags.map(tag => {
            // Remove 'wcag' prefix and convert to dotted format
            // e.g., 'wcag244' -> '2.4.4', 'wcag412' -> '4.1.2'
            const numbers = tag.replace('wcag', '');
            
            if (numbers.length === 3) {
                // e.g., '244' -> '2.4.4'
                return `${numbers[0]}.${numbers[1]}.${numbers[2]}`;
            } else if (numbers.length === 4) {
                // e.g., '1412' -> '1.4.12' (for some longer criterion IDs)
                return `${numbers[0]}.${numbers[1]}.${numbers.slice(2)}`;
            }
            
            return null;
        }).filter(Boolean);
    }

    /**
     * Get W3C documentation links for a Success Criterion
     * @param {string} criterionId - WCAG Success Criterion ID (e.g., '2.4.4')
     * @returns {Object|null} Object with quickref and understanding URLs, or null if not found
     */
    getW3cLinksForCriterion(criterionId) {
        const criterion = this.successCriteriaLookup.get(criterionId);
        if (!criterion || !criterion.references) return null;

        const links = {
            criterion: {
                id: criterionId,
                title: criterion.title,
                level: criterion.level,
                url: criterion.url
            },
            references: {}
        };

        criterion.references.forEach(ref => {
            if (ref.title.includes('How to Meet')) {
                links.references.quickref = {
                    title: ref.title,
                    url: ref.url
                };
            } else if (ref.title.includes('Understanding')) {
                links.references.understanding = {
                    title: ref.title,
                    url: ref.url
                };
            }
        });

        return links;
    }

    /**
     * Get all W3C documentation links for an axe-core rule
     * @param {string[]} tags - Array of axe-core tags
     * @returns {Object[]} Array of W3C link objects for each relevant Success Criterion
     */
    getW3cLinksForRule(tags) {
        if (!this.wcagData) return [];

        const criteriaIds = this.extractWcagCriteriaFromTags(tags);
        const links = [];

        criteriaIds.forEach(criterionId => {
            const criterionLinks = this.getW3cLinksForCriterion(criterionId);
            if (criterionLinks) {
                links.push(criterionLinks);
            }
        });

        return links;
    }

    /**
     * Check if WCAG data is available
     * @returns {boolean} True if WCAG data is loaded and available
     */
    isAvailable() {
        return this.wcagData !== null && this.successCriteriaLookup.size > 0;
    }
}

module.exports = WcagLinkMapper;