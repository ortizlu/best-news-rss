export type CleanOptions = {
  stripHtml: boolean;
  maxDescriptionLength: number;
  removeTrackingParams: boolean;
  dropFullContent: boolean;
  dropMedia: boolean;
  dropAuthors: boolean;
  dropCategories: boolean;
  /** Emit &lt;link&gt; on each item (clickable headlines in some readers). */
  includeItemLinks: boolean;
  /** Emit &lt;enclosure&gt; for the lead image when one exists in the source. */
  includeImages: boolean;
};

export type FeedSource = {
  id: string;
  name: string;
  url: string;
};

export type FeedsConfig = {
  feeds: FeedSource[];
};
