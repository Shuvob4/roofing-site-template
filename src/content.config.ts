import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// ─── Site-wide configuration ────────────────────────────────────────────────────
const siteCollection = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/site' }),
  schema: z.object({
    businessName: z.string().min(1),
    phone: z.string().min(7),
    email: z.string().email(),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      province: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().default('Canada'),
    }),
    hours: z.array(z.object({
      days: z.string().min(1),
      hours: z.string().min(1),
    })),
    serviceAreas: z.array(z.string()).optional(),
    social: z.object({
      google: z.string().url().optional(),
      facebook: z.string().url().optional(),
      instagram: z.string().url().optional(),
    }).optional(),
    mapEmbedUrl: z.string().url().optional(),
    websiteUrl: z.string().url(),
  }),
});

// ─── Theme configuration ────────────────────────────────────────────────────────
const themeCollection = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/theme' }),
  schema: z.object({
    mode: z.enum(['dark', 'light']),
    colors: z.object({
      primary: z.string().min(1),
      secondary: z.string().min(1),
      accent: z.string().min(1),
      background: z.string().min(1),
      text: z.string().min(1),
      emergency: z.string().optional(),
    }),
    fonts: z.object({
      heading: z.string().min(1),
      body: z.string().min(1),
      scale: z.object({
        small: z.string().min(1),
        base: z.string().min(1),
        large: z.string().min(1),
        display: z.string().min(1),
      }),
    }),
    sectionDividerStyle: z.enum(['none', 'diagonal', 'wave']).default('none'),
    borderRadius: z.string().default('0.5rem'),
    breakpoints: z.object({
      sm: z.string().default('640px'),
      md: z.string().default('768px'),
      lg: z.string().default('1024px'),
      xl: z.string().default('1280px'),
    }).optional(),
  }),
});

// ─── Navigation configuration ───────────────────────────────────────────────────
const navCollection = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/nav' }),
  schema: z.object({
    core: z.array(z.object({
      label: z.string().min(1),
      href: z.string().min(1),
      order: z.number().default(0),
    })),
    cta: z.array(z.object({
      label: z.string().min(1),
      href: z.string().min(1),
      order: z.number().default(0),
    })).optional(),
    modules: z.array(z.object({
      moduleName: z.string().min(1),
      label: z.string().min(1),
      href: z.string().min(1),
      order: z.number().default(0),
    })),
  }),
});

// ─── Module toggles ─────────────────────────────────────────────────────────────
const modulesCollection = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/modules' }),
  schema: z.object({
    stormDamage: z.boolean().default(true),
    financing: z.boolean().default(true),
    warranty: z.boolean().default(true),
    maintenance: z.boolean().default(false),
    insuranceClaims: z.boolean().default(true),
    assessment: z.boolean().default(true),
    materials: z.boolean().default(false),
    energyEfficiency: z.boolean().default(false),
    neighborhoods: z.boolean().default(false),
  }),
});

// ─── Services ───────────────────────────────────────────────────────────────────
const servicesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/services' }),
  schema: z.object({
    title: z.string().max(80),
    shortDescription: z.string().max(200),
    image: z.string().optional(),
    icon: z.string().optional(),
    category: z.enum(['residential', 'commercial']),
    detailLink: z.string().optional(),
    order: z.number().default(0),
    stormCtaEnabled: z.boolean().optional(),
  }),
});

// ─── Gallery entries ────────────────────────────────────────────────────────────
const galleryCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/gallery' }),
  schema: z.object({
    title: z.string().max(100),
    beforeImage: z.object({
      src: z.string().min(1),
      alt: z.string().min(1),
    }),
    afterImage: z.object({
      src: z.string().min(1),
      alt: z.string().min(1),
    }).optional(),
    description: z.string().max(500).optional(),
    category: z.string().optional(),
    order: z.number().default(0),
  }),
});

// ─── Testimonials ───────────────────────────────────────────────────────────────
const testimonialsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/testimonials' }),
  schema: z.object({
    customerName: z.string().max(100),
    rating: z.number().int().min(1).max(5),
    location: z.string().max(100).optional(),
    featured: z.boolean().default(false),
  }),
});

// ─── FAQ ────────────────────────────────────────────────────────────────────────
// Question in frontmatter, answer as Markdown body content
const faqCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/faq' }),
  schema: z.object({
    question: z.string().max(200),
  }),
});

// ─── Service Areas ──────────────────────────────────────────────────────────────
const areasCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/areas' }),
  schema: z.object({
    locationName: z.string().min(1),
    locationType: z.enum(['city', 'neighborhood', 'region']),
    groupLabel: z.string().optional(),
  }),
});

// ─── Trust Signals ──────────────────────────────────────────────────────────────
const trustSignalsCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/trust-signals' }),
  schema: z.object({
    category: z.enum([
      'licensed',
      'insured',
      'bonded',
      'warranty-provider',
      'manufacturer-certification',
      'custom',
    ]),
    label: z.string().max(50),
    icon: z.string().min(1),
    altText: z.string().min(1),
    description: z.string().max(200).optional(),
  }),
});

// ─── Pages (hero, emergency, contact) ───────────────────────────────────────────
const heroCollection = defineCollection({
  loader: glob({ pattern: 'hero.yaml', base: 'src/content/pages' }),
  schema: z.object({
    headline: z.string().max(80),
    subheadline: z.string().max(200),
    backgroundImage: z.object({
      src: z.string().min(1),
      alt: z.string().min(1),
    }),
    primaryCTA: z.object({
      text: z.string().max(40),
      link: z.string().min(1),
    }),
    emergencyCTA: z.object({
      text: z.string().min(1),
      link: z.string().min(1),
      color: z.string().optional(),
    }),
  }),
});

const emergencyCollection = defineCollection({
  loader: glob({ pattern: 'emergency.yaml', base: 'src/content/pages' }),
  schema: z.object({
    text: z.string().min(1),
    phone: z.string().min(7),
    availabilityHours: z.string().min(1),
  }),
});

const contactCollection = defineCollection({
  loader: glob({ pattern: 'contact.yaml', base: 'src/content/pages' }),
  schema: z.object({
    heading: z.string().default('Contact Us'),
    subheading: z.string().optional(),
    showMap: z.boolean().default(true),
    formHeading: z.string().default('Send Us a Message'),
  }),
});

// ─── Legal pages ────────────────────────────────────────────────────────────────
const legalCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/legal' }),
  schema: z.object({
    title: z.string().min(1),
    lastUpdated: z.string().min(1),
  }),
});

// ─── Forms configuration ────────────────────────────────────────────────────────
const formsCollection = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/forms' }),
  schema: z.object({
    formBackend: z.object({
      workerEndpoint: z.string().url(),
    }),
    quoteForm: z.object({
      formType: z.string().default('quote'),
      roofTypes: z.array(z.string()),
      maxFiles: z.number().default(5),
      maxFileSizeMB: z.number().default(2),
    }),
    bookingForm: z.object({
      formType: z.string().default('booking'),
      availableHoursStart: z.number().min(0).max(23).default(8),
      availableHoursEnd: z.number().min(0).max(23).default(17),
      maxDaysAhead: z.number().default(60),
    }),
    contactForm: z.object({
      formType: z.string().default('contact'),
    }),
    consent: z.object({
      labelTemplate: z.string().min(1),
    }),
    spam: z.object({
      turnstileSiteKey: z.string().min(1),
      honeypotFieldName: z.string().default('website_url'),
      turnstileEnabled: z.boolean().default(true),
    }),
    analytics: z.object({
      provider: z.string().default('cloudflare'),
      trackingId: z.string().min(1),
    }),
  }),
});

// ─── Storm Damage ───────────────────────────────────────────────────────────────
const stormDamageCollection = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/storm-damage' }),
  schema: z.object({
    headline: z.string().min(1),
    bodyText: z.string().min(1),
    buttonLabel: z.string().min(1),
    linkDestination: z.string().min(1),
    seasonalToggle: z.enum(['visible', 'hidden']),
    stormCtaEnabled: z.boolean().default(true),
  }),
});

// ─── Financing ──────────────────────────────────────────────────────────────────
const financingCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/financing' }),
  schema: z.object({
    providerName: z.string().min(1),
    description: z.string().max(500),
    termsSummary: z.string().max(300),
    entryType: z.enum(['financing', 'payment-method']),
    externalLink: z.string().url().optional(),
  }),
});

// ─── Warranty ───────────────────────────────────────────────────────────────────
const warrantyCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/warranty' }),
  schema: z.object({
    warrantyType: z.enum(['manufacturer', 'workmanship']),
    coverageDescription: z.string().min(1),
    duration: z.string().min(1),
    conditions: z.string().min(1),
  }),
});

// ─── Maintenance Tips ───────────────────────────────────────────────────────────
const maintenanceCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/maintenance' }),
  schema: z.object({
    title: z.string().min(1),
    season: z.array(z.enum(['spring', 'summer', 'fall', 'winter'])).min(1),
    image: z.string().optional(),
  }),
});

// ─── Insurance Claims ───────────────────────────────────────────────────────────
const insuranceCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/insurance' }),
  schema: z.object({
    stepNumber: z.number().int().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    icon: z.string().optional(),
  }),
});

// ─── Assessment ─────────────────────────────────────────────────────────────────
const assessmentCollection = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/assessment' }),
  schema: z.object({
    checklistItems: z.array(z.object({
      label: z.string().min(1),
      description: z.string().optional(),
    })).min(1),
    ctaButtonText: z.string().min(1),
    ctaLink: z.string().min(1),
  }),
});

// ─── Materials Comparison ───────────────────────────────────────────────────────
const materialsCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/materials' }),
  schema: z.object({
    materialName: z.string().min(1),
    pros: z.array(z.string()).min(1),
    cons: z.array(z.string()).min(1),
    estimatedLifespan: z.string().min(1),
    priceTier: z.enum(['budget', 'mid-range', 'premium']),
    image: z.string().optional(),
  }),
});

// ─── Energy Efficiency ──────────────────────────────────────────────────────────
const energyCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/energy' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    benefitSummary: z.string().max(200),
    certificationLabels: z.array(z.string()).optional(),
  }),
});

// ─── Neighborhoods ──────────────────────────────────────────────────────────────
const neighborhoodsCollection = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: 'src/content/neighborhoods' }),
  schema: z.object({
    areaName: z.string().min(1),
    projectsCompleted: z.number().int().min(1),
    featuredTestimonialText: z.string().optional(),
    customerName: z.string().optional(),
  }),
});

// ─── Export all collections ─────────────────────────────────────────────────────
export const collections = {
  site: siteCollection,
  theme: themeCollection,
  nav: navCollection,
  modules: modulesCollection,
  services: servicesCollection,
  gallery: galleryCollection,
  testimonials: testimonialsCollection,
  faq: faqCollection,
  areas: areasCollection,
  'trust-signals': trustSignalsCollection,
  hero: heroCollection,
  emergency: emergencyCollection,
  contact: contactCollection,
  legal: legalCollection,
  forms: formsCollection,
  'storm-damage': stormDamageCollection,
  financing: financingCollection,
  warranty: warrantyCollection,
  maintenance: maintenanceCollection,
  insurance: insuranceCollection,
  assessment: assessmentCollection,
  materials: materialsCollection,
  energy: energyCollection,
  neighborhoods: neighborhoodsCollection,
};
