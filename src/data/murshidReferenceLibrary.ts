/**
 * Curated source register for Murshid's agricultural reference library.
 * Source records describe evidence sources, not diagnoses or country-level presence.
 * Dataset licensing is tracked separately from scientific reliability.
 */

export type MurshidSourceKind = 'technical-guide' | 'taxonomic-database' | 'research-paper' | 'image-dataset';
export type MurshidSourceStatus = 'preferred-reference' | 'supporting-reference' | 'review-required' | 'restricted';
export type MurshidEvidenceDomain = 'date-palm' | 'plant-health-general' | 'taxonomy-and-distribution' | 'crop-image-diagnostics';

export interface MurshidReferenceSource {
  id: string;
  title: string;
  organization: string;
  year?: number;
  kind: MurshidSourceKind;
  domains: MurshidEvidenceDomain[];
  url: string;
  licenseOrTerms: string;
  status: MurshidSourceStatus;
  permittedUse: string;
  limitations: string[];
}

export const MURSHID_REFERENCE_SOURCES: MurshidReferenceSource[] = [
  {
    id: 'icarda-date-palm-ipm-2018',
    title: 'Date Palm Pests and Diseases: Integrated Management Guide',
    organization: 'ICARDA and regional date-palm specialists',
    year: 2018,
    kind: 'technical-guide',
    domains: ['date-palm', 'plant-health-general'],
    url: 'https://hdl.handle.net/20.500.11766/8914',
    licenseOrTerms: 'CC-BY-SA-4.0; verify version and attribution requirements when reusing material',
    status: 'preferred-reference',
    permittedUse: 'Primary regional reference for date-palm pest and disease biology and integrated management; summarize with attribution.',
    limitations: ['Regional guidance must be adapted to crop, climate, registration and label requirements.', 'A pest described in the guide is not automatically confirmed in every country.', 'Check individual rights before copying book figures or photographs.']
  },
  {
    id: 'eppo-global-database',
    title: 'EPPO Global Database',
    organization: 'European and Mediterranean Plant Protection Organization',
    kind: 'taxonomic-database',
    domains: ['taxonomy-and-distribution', 'plant-health-general'],
    url: 'https://gd.eppo.int/',
    licenseOrTerms: 'Public database access; reuse of records, maps and images must follow EPPO terms and asset-specific rights.',
    status: 'preferred-reference',
    permittedUse: 'Verify scientific names, synonyms, host plants, taxonomy and reported geographic distribution.',
    limitations: ['Record country, date and source for distribution claims.', 'Do not infer local prevalence from a global species record.', 'Not a substitute for laboratory confirmation.']
  },
  {
    id: 'plantdoc-2019',
    title: 'PlantDoc: A Dataset for Visual Plant Disease Detection',
    organization: 'Singh et al.',
    year: 2020,
    kind: 'image-dataset',
    domains: ['crop-image-diagnostics'],
    url: 'https://github.com/pratikkayal/PlantDoc-Dataset',
    licenseOrTerms: 'Repository states CC-BY-4.0; individual scraped-image rights require review.',
    status: 'review-required',
    permittedUse: 'Research benchmark and field-domain comparison only after provenance and rights review.',
    limitations: ['Internet-scraped images can retain third-party copyright restrictions.', 'Mixed provenance and variable label quality.', 'Not regional field validation.']
  },
  {
    id: 'plantvillage-2016',
    title: 'PlantVillage',
    organization: 'Hughes, Mohanty and collaborators',
    year: 2016,
    kind: 'image-dataset',
    domains: ['crop-image-diagnostics'],
    url: 'https://github.com/spMohanty/PlantVillage-Dataset',
    licenseOrTerms: 'CC-BY-SA-3.0 is stated by a dataset card; source snapshots and applicable terms require verification.',
    status: 'review-required',
    permittedUse: 'Benchmark and controlled-image baseline only after licensing review.',
    limitations: ['Mostly detached leaves and controlled backgrounds.', 'May not generalize to field images with glare, complex backgrounds and partial symptoms.', 'Not sole evidence of real-world diagnostic accuracy.']
  },
  {
    id: 'ip102-insect-benchmark',
    title: 'IP102 Insect Pest Recognition Dataset',
    organization: 'Wu et al.',
    year: 2019,
    kind: 'image-dataset',
    domains: ['crop-image-diagnostics'],
    url: 'https://github.com/xpwu95/IP102',
    licenseOrTerms: 'Academic/non-commercial restrictions have been reported; verify exact upstream terms.',
    status: 'restricted',
    permittedUse: 'Academic benchmark only unless commercial and product-training rights are explicitly obtained.',
    limitations: ['Do not train production Murshid weights without rights clearance.', 'Insect identity alone does not establish affected crop or damage cause.', 'Taxonomic mapping and class balance require review.']
  }
];

export const MURSHID_LIBRARY_EVIDENCE_RULES = [
  'Separate scientific identity, host range, symptoms, management and geographic occurrence into distinct claims.',
  'Record country, locality, observation date, source and evidence type for every occurrence claim.',
  'Prefer expert-reviewed field observations, official plant-protection records, diagnostic standards and peer-reviewed studies.',
  'Use image datasets only after checking image-level provenance, annotation quality, duplicates and licence.',
  'Never treat an image caption, web search result or model prediction as a confirmed diagnosis.',
  'Keep lookalike causes such as nutrient disorders, salinity, heat, drought, waterlogging, spray injury and root damage in the differential.',
  'Do not publish pesticide products or rates without current local registration and label verification.',
  'When evidence conflicts or is weak, show uncertainty and request a better image or expert confirmation.'
] as const;
