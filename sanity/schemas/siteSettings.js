export const siteSettings = {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  // singleton — only one instance
  __experimental_actions: ['update', 'publish'],
  fields: [
    {
      name: 'tagline',
      title: 'Header tagline',
      type: 'string',
      description: 'Appears top-right of the landing page',
    },
    {
      name: 'websiteUrl',
      title: 'Website URL shown in header',
      type: 'string',
    },
    {
      name: 'websiteUrlLabel',
      title: 'Website URL label',
      type: 'string',
      description: 'e.g. "beingmad.co"',
    },
    {
      name: 'contactEmail',
      title: 'Contact email (for CTAs)',
      type: 'string',
    },
    {
      name: 'socials',
      title: 'Social links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'label', title: 'Label', type: 'string'},
            {name: 'url', title: 'URL', type: 'url'},
          ],
        },
      ],
    },

    /* ─── MANIFESTO PAGE — opened via the bottomnav primary CTA ─── */
    {
      name: 'manifestoTitle',
      title: 'Manifesto · big headline',
      type: 'text',
      rows: 2,
      description: 'HTML <em> tags supported for italicized words. e.g. "Creativity is <em>madness</em><br>with a deadline."',
    },
    {
      name: 'manifestoBody',
      title: 'Manifesto · philosophy paragraphs',
      type: 'text',
      rows: 8,
      description: 'Multi-paragraph "about me / studio philosophy". Separate paragraphs with a blank line. Inline <strong> and <em> allowed.',
    },
    {
      name: 'manifestoStats',
      title: 'Manifesto · quick stats row',
      type: 'array',
      description: 'Up to 4 short stats (e.g. {9, Years in the game}, {200+, Campaigns shipped}).',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'value', title: 'Number / value', type: 'string'},
            {name: 'label', title: 'Label', type: 'string'},
          ],
          preview: {select: {title: 'value', subtitle: 'label'}},
        },
      ],
      validation: (R) => R.max(4),
    },
    {
      name: 'awardsWon',
      title: 'Awards — won',
      type: 'array',
      description: 'Awards / honors received. Newest first.',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'title', title: 'Award title', type: 'string'},
            {name: 'organization', title: 'Awarding body', type: 'string'},
            {name: 'year', title: 'Year', type: 'string'},
            {name: 'project', title: 'Project / campaign (optional)', type: 'string'},
            {name: 'link', title: 'Link (optional)', type: 'url'},
          ],
          preview: {
            select: {title: 'title', org: 'organization', year: 'year'},
            prepare({title, org, year}) {
              return {title: title || 'Untitled', subtitle: [year, org].filter(Boolean).join(' · ')}
            },
          },
        },
      ],
    },
    {
      name: 'awardsShortlisted',
      title: 'Awards — shortlisted / nominated',
      type: 'array',
      description: 'Same shape as awards won, but for shortlists / finalists.',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'title', title: 'Award title', type: 'string'},
            {name: 'organization', title: 'Awarding body', type: 'string'},
            {name: 'year', title: 'Year', type: 'string'},
            {name: 'project', title: 'Project / campaign (optional)', type: 'string'},
            {name: 'link', title: 'Link (optional)', type: 'url'},
          ],
          preview: {
            select: {title: 'title', org: 'organization', year: 'year'},
            prepare({title, org, year}) {
              return {title: title || 'Untitled', subtitle: [year, org].filter(Boolean).join(' · ')}
            },
          },
        },
      ],
    },
    {
      name: 'pressFeatures',
      title: 'Press / featured in',
      type: 'array',
      description: 'Publications or platforms that featured the work. e.g. Behance Featured, IT\'S NICE THAT.',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'outlet', title: 'Outlet / publication', type: 'string'},
            {name: 'year', title: 'Year', type: 'string'},
            {name: 'title', title: 'Article / feature title (optional)', type: 'string'},
            {name: 'link', title: 'Link (optional)', type: 'url'},
          ],
          preview: {
            select: {outlet: 'outlet', year: 'year'},
            prepare({outlet, year}) {
              return {title: outlet || 'Press', subtitle: year}
            },
          },
        },
      ],
    },
  ],
  preview: {
    prepare() {
      return {title: 'Site Settings'}
    },
  },
}
