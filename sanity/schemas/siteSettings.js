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
  ],
  preview: {
    prepare() {
      return {title: 'Site Settings'}
    },
  },
}
