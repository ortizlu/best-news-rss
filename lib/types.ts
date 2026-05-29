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
  /** How many HTML &lt;p&gt; blocks to include. 1 = lead paragraph only (default). */
  maxParagraphs: number;
  /** Drop sports-section items (URL path / RSS category). */
  excludeSports?: boolean;
};

export type FeedSource = {
  id: string;
  name: string;
  url: string;
  /** Drop items that look Spanish (e.g. WTOP syndicates Spanish wire copy). */
  englishOnly?: boolean;
  /** Drop sports-section items from this source. */
  excludeSports?: boolean;
};

export type FeedsConfig = {
  feeds: FeedSource[];
};
