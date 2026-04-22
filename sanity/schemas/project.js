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
