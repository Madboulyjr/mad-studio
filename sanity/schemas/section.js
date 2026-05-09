export const section = {
  name: 'section',
  title: 'Section (Originals / Bubble / MAD+ / Vision)',
  type: 'document',
  fields: [
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'originals | bubble | music | vision',
      options: {source: 'title', maxLength: 40},
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: '01 = Originals, 02 = Bubble, 03 = MAD+, 04 = Vision',
    },
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g. "MAD Originals."',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      description: 'e.g. "The main studio practice"',
    },
    {
      name: 'description',
      title: 'Short description',
      type: 'text',
      description: 'Used on the landing card (e.g. "Art direction, campaigns & visual identity.")',
    },
    {
      name: 'cardLabel',
      title: 'Nav card label (smaller text)',
      type: 'string',
      description: 'e.g. "Main Studio · Portfolio"',
    },
    {
      name: 'landingBg',
      title: 'Landing background (hex)',
      type: 'string',
      description: 'Background color when this section is active, e.g. "#0D0D0D"',
    },
    {
      name: 'landingAccent',
      title: 'Landing accent (hex)',
      type: 'string',
      description: 'Accent/foreground color when this section is active, e.g. "#FF313B"',
    },
    {
      name: 'landingHeadline',
      title: 'Landing headline (multi-line)',
      type: 'text',
      rows: 2,
      description: 'Shown as the giant headline on the landing. Newlines preserved, e.g. "MAD\\nORIGINALS."',
    },
    {
      name: 'landingSubtitle',
      title: 'Landing subtitle (HTML allowed)',
      type: 'text',
      rows: 3,
      description: 'Shown under the headline. <em> and <br> tags allowed.',
    },
    {
      name: 'counterLabel',
      title: 'Counter label',
      type: 'string',
      description: 'Word shown in the counter, e.g. "Originals", "Bubble", "Plus", "Vision"',
    },
    {
      name: 'kicker',
      title: 'Detail-page kicker',
      type: 'string',
      description: 'e.g. "01 / The Main Practice"',
    },
    {
      name: 'manifesto',
      title: 'Detail-page manifesto',
      type: 'text',
      description: 'Allow HTML <em> tags for italicized words, e.g. "Creativity is <em>madness</em> with a deadline."',
      rows: 3,
    },
    {
      name: 'lead',
      title: 'Detail-page lead paragraph',
      type: 'text',
      description: 'Allow HTML <strong> tags for bolded spans.',
      rows: 4,
    },
    {
      name: 'agencies',
      title: 'Agencies / collaborators list',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Scrolls across the detail page. Leave empty to hide.',
    },
    {
      name: 'worksLabel',
      title: 'Works section label',
      type: 'string',
      description: 'e.g. "Selected Works"',
    },
    {
      name: 'worksTitle',
      title: 'Works section title',
      type: 'string',
      description: 'e.g. "A Fine Selection."',
    },
    {
      name: 'illustrationSvg',
      title: 'Landing illustration (SVG markup)',
      type: 'text',
      description: 'Paste the full <svg>...</svg> markup for this section.',
      rows: 6,
    },

    // ─── MUSIC SECTION FIELDS (used on MAD+ section) ─────────────────────
    {
      name: 'musicEmbed',
      title: 'Music embed (Spotify or YouTube)',
      type: 'object',
      description: 'Embedded player shown at the top of the section page. Optional.',
      options: {collapsible: true, collapsed: true},
      fields: [
        {
          name: 'type',
          title: 'Platform',
          type: 'string',
          options: {
            list: [
              {title: 'Spotify (artist, album, playlist or track)', value: 'spotify'},
              {title: 'YouTube (video, playlist, or channel)', value: 'youtube'},
              {title: 'SoundCloud (track or set)', value: 'soundcloud'},
              {title: 'Apple Music (album or playlist)', value: 'apple-music'},
            ],
            layout: 'radio',
          },
        },
        {
          name: 'embedUrl',
          title: 'Embed URL (or full link, we extract the embed ID)',
          type: 'url',
          description:
            'Spotify: paste any spotify.com link (artist/track/album/playlist). ' +
            'YouTube: paste youtube.com/watch?v=... or youtu.be/... or playlist link. ' +
            'SoundCloud: paste the full track/set URL. Apple Music: paste any album URL.',
        },
        {
          name: 'caption',
          title: 'Caption (optional)',
          type: 'string',
          description: 'Shown above the embed, e.g. "Latest release" or "Listen now"',
        },
      ],
    },
    {
      name: 'musicPlatforms',
      title: 'Music platform links',
      type: 'array',
      description: 'Listed as a row of pill buttons on the section page.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {
                list: [
                  {title: 'Spotify', value: 'spotify'},
                  {title: 'Apple Music', value: 'apple-music'},
                  {title: 'YouTube Music', value: 'youtube-music'},
                  {title: 'YouTube', value: 'youtube'},
                  {title: 'SoundCloud', value: 'soundcloud'},
                  {title: 'Tidal', value: 'tidal'},
                  {title: 'Anghami', value: 'anghami'},
                  {title: 'Bandcamp', value: 'bandcamp'},
                  {title: 'Deezer', value: 'deezer'},
                  {title: 'Amazon Music', value: 'amazon-music'},
                ],
              },
            },
            {name: 'url', title: 'URL', type: 'url'},
            {name: 'label', title: 'Custom label (optional)', type: 'string'},
          ],
          preview: {
            select: {title: 'platform', subtitle: 'url'},
          },
        },
      ],
    },
    {
      name: 'instagramMusic',
      title: 'Instagram (music account)',
      type: 'object',
      description: 'Optional dedicated Instagram handle for music — appears as a pill button alongside the platforms.',
      options: {collapsible: true, collapsed: true},
      fields: [
        {name: 'handle', title: 'Handle (without @)', type: 'string', description: 'e.g. "madbouly.music"'},
        {name: 'url', title: 'Full URL (optional, auto-built from handle if blank)', type: 'url'},
      ],
    },
  ],
  orderings: [
    {title: 'Display order', name: 'order', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'title', subtitle: 'subtitle', slug: 'slug.current'},
    prepare({title, subtitle, slug}) {
      return {title, subtitle: subtitle ? `${subtitle} · /${slug}` : `/${slug}`}
    },
  },
}
