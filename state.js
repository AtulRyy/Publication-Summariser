// Shared mutable application state — single source of truth.
// Import and mutate directly; modules that need reactivity read from here.
export const state = {
  // Faculty filters
  activeDept:    'all',
  activeDesig:   'all',
  searchQuery:   '',
  viewMode:      'grid',   // 'grid' | 'list'

  // Profile panel
  currentFaculty: null,

  // Publications
  allLoadedWorks:  [],
  pubSortBy:       'year-desc',
  pubFilterType:   'all',
  currentPubItems: [],     // filtered/sorted slice shown in the list (for modal index access)
};
