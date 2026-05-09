export const project = {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 60},
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{type: 'section'}],
      description: 'Which section this project belongs to (Originals, Bubble, MAD+, Vision)',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'order',
      title: 'Display order within section',
      type: 'number',
      description: '01, 02, 03... Lower numbers appear first.',
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      description: 'e.g. "2024"',
    },
    {
      name: 'caption',
      title: 'Caption / short description',
      type: 'text',
      description: 'Shown under the title. Keep to one line if possible.',
      rows: 2,
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
      description: 'e.g. "Art Direction", "Creative Direction", "360 Campaign"',
    },

    // ─── CASE STUDY FIELDS ─── (per 2026 portfolio best practice: lead with results)
    {
      name: 'caseStudy',
      title: 'Case study',
      type: 'object',
      description: 'Optional structured case-study fields. Render in priority order on the project page: outcome → role → problem → constraints → process.',
      options: {collapsible: true, collapsed: true},
      fields: [
        {
          name: 'role',
          title: 'Your role',
          type: 'string',
          description: 'e.g. "Art Direction · Creative Direction" — shown on the project hero',
        },
        {
          name: 'agency',
          title: 'Agency / collaborator credit',
          type: 'string',
          description: 'e.g. "with Wunderman Thompson MENA" — shown after role',
        },
        {
          name: 'client',
          title: 'Client',
          type: 'string',
          description: 'e.g. "BIOLAB" or "Vodafone Egypt"',
        },
        {
          name: 'outcome',
          title: 'Outcome / impact metrics',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                {name: 'metric', title: 'Metric', type: 'string', description: 'e.g. "37%" or "8M"'},
                {name: 'label', title: 'Label', type: 'string', description: 'e.g. "lift in completion rate" or "regional reach"'},
              ],
              preview: {select: {title: 'metric', subtitle: 'label'}},
            },
          ],
          description: '2–4 metrics shown as a stat row above the gallery. Leads with results — ✨ biggest credibility unlock for case studies.',
          validation: (Rule) => Rule.max(4),
        },
        {
          name: 'problem',
          title: 'Problem statement',
          type: 'text',
          rows: 3,
          description: 'What did the brand need? 1–2 sentences. e.g. "BIOLAB needed to feel clinical AND warm — without losing scientific authority."',
        },
        {
          name: 'constraints',
          title: 'Constraints',
          type: 'array',
          of: [{type: 'string'}],
          options: {layout: 'tags'},
          description: 'Time/budget/scope limits — adds credibility. e.g. "8-week timeline", "Single art director", "Print + digital + OOH"',
        },
        {
          name: 'process',
          title: 'Process notes (optional rich-text)',
          type: 'array',
          of: [{type: 'block'}],
          description: 'Optional. Process narrative shown after the gallery. Keep tight — recruiters scan, they do not read.',
        },
        {
          name: 'awards',
          title: 'Awards / recognition',
          type: 'array',
          of: [{type: 'string'}],
          options: {layout: 'tags'},
          description: 'e.g. "Cannes Bronze 2024", "D&AD Wood Pencil"',
        },
        {
          name: 'externalUrl',
          title: 'External case study / press URL',
          type: 'url',
          description: 'Optional link to a fuller writeup, press article, or live project.',
        },
      ],
    },
    {
      name: 'coverImage',
      title: 'Cover / preview image',
      type: 'image',
      options: {hotspot: true},
      description: 'Thumbnail shown in the works list.',
    },
    {
      name: 'media',
      title: 'Project media (images + videos)',
      type: 'array',
      description: 'Full gallery shown inside the project detail page. Drag to reorder.',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {name: 'alt', title: 'Alt text', type: 'string'},
            {name: 'caption', title: 'Caption', type: 'string'},
          ],
        },
        {
          type: 'object',
          name: 'videoItem',
          title: 'Video (Mux)',
          fields: [
            {
              name: 'video',
              title: 'Video file',
              type: 'mux.video',
              description: 'Upload an MP4/MOV; Mux transcodes automatically.',
            },
            {name: 'caption', title: 'Caption', type: 'string'},
            {
              name: 'autoplay',
              title: 'Autoplay muted',
              type: 'boolean',
              initialValue: true,
            },
          ],
          preview: {
            select: {caption: 'caption'},
            prepare({caption}) {
              return {title: 'Video', subtitle: caption || ''}
            },
          },
        },
      ],
    },
    {
      name: 'published',
      title: 'Published',
      type: 'boolean',
      description: 'Uncheck to hide from the live site.',
      initialValue: true,
    },
  ],
  orderings: [
    {title: 'Section → Order', name: 'sectionOrder', by: [
      {field: 'section.order', direction: 'asc'},
      {field: 'order', direction: 'asc'},
    ]},
    {title: 'Year (newest first)', name: 'yearDesc', by: [{field: 'year', direction: 'desc'}]},
  ],
  preview: {
    select: {
      title: 'title',
      year: 'year',
      section: 'section.title',
      media: 'coverImage',
    },
    prepare({title, year, section, media}) {
      return {
        title,
        subtitle: [section, year].filter(Boolean).join(' · '),
        media,
      }
    },
  },
}
