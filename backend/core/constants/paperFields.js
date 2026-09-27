/**
 * Canonical field names for the PaperInfo Mongoose schema.
 *
 * These strings contain spaces, apostrophes, or other non-alphanumeric
 * characters and are used verbatim throughout the codebase. Centralising
 * them here prevents silent mismatches from typos or inconsistent casing.
 */

module.exports = {
    COLLECTED_DATA: 'Collected Data',
    COURSE_NAME: 'Course Name',
    COURSE_CODE: 'Course Code',
    COURSE_TEACHER: 'Course Teacher',
    COLLEGE_NAME: 'College Name',
    YEAR_OF_STUDY: 'Year Of Study',
    BLOOMS_TAXONOMY_LEVEL: "Bloom's Taxonomy Level",
    BLOOMS_VERBS: "Bloom's Verbs",
    BLOOMS_HIGHEST_VERB: "Bloom's Highest Verb",
    QUESTION_NO: 'Question No',
    QUESTION_TYPE: 'Question Type',

    DEFAULT_BLOOM_LEVEL_MAP: Object.freeze({
        remember: 1,
        understand: 2,
        apply: 3,
        analyze: 4,
        evaluate: 5,
        create: 6,
    }),
};
