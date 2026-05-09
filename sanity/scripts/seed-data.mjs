// Hardcoded content snapshot from the current mad-studio.html, migrated to Sanity.
// Edit these objects to change the first seed, then re-run `npm run seed`.

export const SITE_SETTINGS = {
  tagline: 'where bold ideas meet sharp minds.',
  websiteUrl: 'https://beingmad.co',
  websiteUrlLabel: 'beingmad.co',
  contactEmail: 'madboulyjr.7@gmail.com',
  socials: [
    {label: 'Behance', url: 'https://www.behance.net/madbovlly'},
    {label: 'Instagram', url: 'https://instagram.com/'},
  ],
}

export const SECTIONS = [
  {
    slug: 'originals',
    order: 1,
    title: 'MAD Originals.',
    subtitle: 'The main studio practice.',
    description: 'Art direction, campaigns & visual identity.',
    cardLabel: 'Main Studio · Portfolio',
    landingBg: '#0D0D0D',
    landingAccent: '#FF313B',
    landingHeadline: 'MAD\nORIGINALS.',
    landingSubtitle:
      'ART DIRECTION, CAMPAIGNS & VISUAL IDENTITY. <em>the main studio practice.</em><br>WHERE CONCEPT MEETS CRAFT FOR BRANDS THAT WANT TO STOP SCROLLS.',
    counterLabel: 'Originals',
    kicker: '01 / The Main Practice',
    manifesto: 'Creativity is <em>madness</em> with a deadline.',
    lead:
      'Art direction, campaigns & visual identity for brands that refuse to blend in. Nine years building loud worlds for clients across the region — launching Google Arabia, a full year of Vodafone RED, Mazda re-launches, Mondelez packaging. <strong>The work doesn\'t whisper.</strong> It picks a fight with the scroll, makes the brief feel small, and earns its place in the feed by being the thing nobody saw coming. Trained at AKQA, FP7, Acquaint and Socialeyez. Now operating on my own terms.',
    agencies: [
      'Acquaint',
      'Socialeyez Dubai',
      'Google Arabia',
      'Vodafone',
      'Mazda',
      'Mondelez',
      "Hardee's",
      'AKQA (WPP)',
      'FP7 Cairo',
    ],
    worksLabel: 'Selected Works',
    worksTitle: 'A Fine Selection.',
  },
  {
    slug: 'bubble',
    order: 2,
    title: 'MAD Bubble.',
    subtitle: 'Personal art & experiments.',
    description: 'Personal art & experiments.',
    cardLabel: 'Personal Art · Experimental',
    landingBg: '#D0FA51',
    landingAccent: '#584CF5',
    landingHeadline: 'MAD\nBUBBLE.',
    landingSubtitle:
      "IDEAS THAT DON'T FIT THE BRIEF. PERSONAL & EXPERIMENTAL FAN ART.<br>CULTURAL LOVE LETTERS, <em>Things That Exist Just Because They Should.</em>",
    counterLabel: 'Bubble',
    kicker: '02 / Experimental Practice',
    manifesto: 'Normal is <em>over-rated.</em> Be mad.',
    lead:
      'Bubble is the playground. The pieces that don\'t fit a brief, the obsessions that won\'t sit still, the cultural love-letters and weird side-projects I make because nobody asked me to. <strong>This is where the studio breathes.</strong> Fan-art, posters, type experiments, surreal portraits — anything that lets the practice stay sharp without a client in the room. If Originals is the work, Bubble is the why.',
    agencies: [],
    worksLabel: 'Selected Works',
    worksTitle: 'The Bubble.',
  },
  {
    slug: 'music',
    order: 3,
    title: 'MAD+.',
    subtitle: 'Music production.',
    description: 'Sound, beats & production.',
    cardLabel: 'Music Production',
    landingBg: '#FF313B',
    landingAccent: '#D0FA51',
    landingHeadline: 'MAD+\nMUSIC.',
    landingSubtitle:
      'MAKING MUSIC SINCE I WAS YOUNG. SCORING ADS, FILMS, SERIES.<br>PRODUCING ORIGINALS. DEEP HOUSE, EGYPTIAN INSTRUMENTS, AFRO SOUNDS<br>AUTHENTIC SOUND DIRECTION, <em>No Formula.</em>',
    counterLabel: 'Plus',
    kicker: '03 / The Sonic Practice',
    manifesto: 'The <em>mad</em> ones hear it before it exists.',
    lead:
      'I\'ve been making music since I was a kid — way before the design career started. MAD+ is the sonic side of the studio: scoring ads, films and series, producing originals, mixing deep house with Egyptian instruments and Afro textures. <strong>No formulas, no presets, no algorithm-friendly hooks.</strong> Just a producer who reads the brand the way he reads a track — looking for the unexpected sample that makes the whole thing land.',
    agencies: [],
    worksLabel: 'Selected Tracks',
    worksTitle: 'The Record.',
  },
  {
    slug: 'vision',
    order: 4,
    title: 'MAD Vision.',
    subtitle: 'Video generating · storytelling.',
    description: 'Video generating · storytelling.',
    cardLabel: 'Video · Storytelling',
    landingBg: '#584CF5',
    landingAccent: '#D0FA51',
    landingHeadline: 'MAD\nVISION.',
    landingSubtitle:
      'CREATING ADS, FILMS, SHORTS, MUSIC VIDEOS. AESTHETIC, CONCEPTUAL,<br>EXECUTION-DRIVEN. <em>Using AI Tools To Break Visual Limits,</em><br>THROUGH EXPERIMENTAL PRODUCTION.',
    counterLabel: 'Vision',
    kicker: '04 / The Narrative Practice',
    manifesto: 'Mad <em>isn\'t</em> a problem. It\'s a process.',
    lead:
      'Vision is the moving-image arm — ads, shorts, music videos, brand films. Concept-first, execution-driven, and unafraid to push generative tools into the production pipeline when they earn their place. <strong>AI is a brush, not the painter.</strong> I use it to break the limits of stock-footage thinking and make visuals that wouldn\'t exist on a normal budget. Every frame still has to mean something.',
    agencies: [],
    worksLabel: 'Selected Work',
    worksTitle: 'Moving Pictures.',
  },
]

// Each caption uses ' — ' as a separator: brief left | approach right.
// Detail page splits on this to fill the 2-column description block.
export const ORIGINALS_PROJECTS = [
  {slug: 'land-rover',            title: 'Land Rover',            year: '2023', caption: 'Performance brand work for Land Rover MENA — premium, kinetic, and built for both digital placements and out-of-home presence. — A bold visual system anchored in the vehicle as hero. Cinematic lighting, sharp typography and a measured restraint that reads as confidence rather than noise.', tags: ['Art Direction','Digital','OOH'], imgs: ['land-rover.jpg','land-rover-img1.jpg','land-rover-img2.jpg','land-rover-img3.jpg']},
  {slug: 'google-arabia',         title: 'Google Arabia',         year: '2018', caption: 'Ask Google — the launching campaign that introduced Google Search\'s Arabic capabilities to the region with a 360 storytelling push. — Concept-led art direction that turned everyday questions into shareable moments. Print, digital, social and OOH stitched into one cohesive voice.', tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['google-arabia.jpg','google-arabia-img1.jpg','google-arabia-img2.jpg','google-arabia-img3.jpg','google-arabia-img4.jpg']},
  {slug: 'biolab',                title: 'BIOLAB',                year: '2024', caption: 'A 360 launch campaign for Saudi medical-lab provider BIOLAB — translating clinical precision into a warm, human visual language. — 3D-rendered hero scenes paired with confident type and a calm palette. Built so a billboard, an Instagram cut-down and a clinic poster all feel like the same brand.', tags: ['Art Direction','3D Design','Creative Direction','360 Campaign'], imgs: ['biolab.jpg','biolab-img1.jpg','biolab-img2.jpg','biolab-img3.jpg','biolab-img4.jpg']},
  {slug: 'bank-aljazira',         title: 'Bank Aljazira',         year: '2024', caption: 'A retail-banking campaign for Bank Aljazira KSA — modern, accessible, and very deliberately not stuffy. — 3D viz of products and customer moments cut against bold type lockups. The work makes finance feel like something built for the next generation, not the last one.', tags: ['Art Direction','3D Viz','Creative Direction','360 Campaign'], imgs: ['bank-aljazira.jpg','bank-aljazira-img1.jpg','bank-aljazira-img2.jpg','bank-aljazira-img3.jpg','bank-aljazira-img4.jpg']},
  {slug: 'vodafone-red',          title: 'Vodafone RED',          year: '2020', caption: 'Premium RED subscription announcement — a year-long art direction lead positioning Vodafone\'s top-tier offer to consumers. — Took the RED equity and pushed it into a louder, more expressive identity territory. Continuous campaign output across launch, retention and seasonal pushes.', tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['vodafone-red.jpg','vodafone-red-img1.jpg','vodafone-red-img2.jpg','vodafone-red-img3.jpg','vodafone-red-img4.jpg']},
  {slug: 'zain-ksa',              title: 'Zain KSA',              year: '2024', caption: 'Always-on digital campaign work for Zain Saudi Arabia — fast turnaround, social-first, with the visual rigour of a print campaign. — Modular templates with strong colour blocking and a typographic grid that holds up at any aspect ratio. Built to ship daily without losing brand.', tags: ['Art Direction','Creative Direction','Digital'], imgs: ['zain-ksa.jpg','zain-ksa-img1.jpg','zain-ksa-img2.jpg','zain-ksa-img3.jpg','zain-ksa-img4.jpg']},
  {slug: 'jeddah-airports',       title: 'Jeddah Airports',       year: '2024', caption: 'Visual identity and digital toolkit for Jeddah Airports — turning travel infrastructure into a brand experience. — Photorealistic 3D viz of terminal moments paired with a clean wayfinding-led type system. The work feels engineered, not decorated.', tags: ['Art Direction','3D Viz','Digital'], imgs: ['jeddah-airports.jpg','jeddah-airports-img1.jpg','jeddah-airports-img2.jpg','jeddah-airports-img3.jpg','jeddah-airports-img4.jpg']},
  {slug: 'saudi-games',           title: 'Saudi Games',           year: '2023', caption: 'Identity and 360 campaign for Saudi Games — a national multi-sport event needing energy, scale and instant recognisability. — Generated 3D athlete imagery with stadium-scale type lockups. Built so a stadium banner and a TikTok loop both deliver the same heat.', tags: ['Art Direction','3D Design','Creative Direction','360 Campaign'], imgs: ['saudi-games.jpg','saudi-games-img1.jpg','saudi-games-img2.jpg','saudi-games-img3.jpg','saudi-games-img4.jpg','saudi-games-img5.jpg','saudi-games-img6.jpg','saudi-games-img7.jpg']},
  {slug: 'qiddiya',               title: 'Qiddiya',               year: '2025', caption: 'Brand work for Qiddiya — Saudi Arabia\'s entertainment city — turning a giga-project into a tangible, exciting destination story. — Layered art direction across digital, social and OOH. Confident type with bold imagery that captures the scale of what\'s being built.', tags: ['Art Direction','Digital','OOH'], imgs: ['qiddiya.jpg','qiddiya-img1.jpg','qiddiya-img2.jpg','qiddiya-img3.jpg']},
  {slug: 'film-commission',       title: 'Film Commission',       year: '2025', caption: 'Saudi Film Commission — a campaign positioning the Kingdom as a serious filmmaking destination for international productions. — Cinema-grade visuals, location-led storytelling and an editorial typographic system. Built to make producers and directors take the location reel seriously.', tags: ['Art Direction','Digital','OOH'], imgs: ['film-commission.jpg','film-commission-img1.jpg','film-commission-img2.jpg','film-commission-img3.jpg']},
  {slug: 'jb-financial',          title: 'JB Financial',          year: '2025', caption: 'Ramadan campaign × Vimto for JB Financial — taking a beloved Ramadan ritual and turning it into a finance-app conversion driver. — Warm, food-led art direction that nods to nostalgia without being saccharine. The campaign respected the moment while still doing the commercial job.', tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['jb-financial.jpg','jb-financial-img1.jpg','jb-financial-img2.jpg','jb-financial-img3.jpg','jb-financial-img4.jpg','jb-financial-img5.jpg','jb-financial-img6.jpg']},
  {slug: 'atp-next-gen',          title: 'ATP Next Gen',          year: '2024', caption: 'ATP Next Gen Finals — branding and on-ground activation work for the tour\'s under-21 stage in Jeddah. — Match-day toolkit, social templates and physical activations. Tournament-grade pace with a system designers could ship without dropping quality.', tags: ['Art Direction','Digital','On-Ground Activation'], imgs: ['atp-next-gen.jpg','atp-next-gen-img1.jpg','atp-next-gen-img2.jpg','atp-next-gen-img3.jpg','atp-next-gen-img4.jpg']},
  {slug: 'temmys',                title: "Temmy's",               year: '2021', caption: "Temmy's snacks — a brand re-launch in Egypt aimed squarely at Gen Z's appetite for things that look as loud as they taste. — Bright, playful, packaging-led art direction. The campaign treated TVCs, social and shelf as one continuous flavour run, not three different jobs.", tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['temmys.jpg','temmys-img1.jpg','temmys-img2.jpg','temmys-img3.jpg','temmys-img4.jpg']},
  {slug: 'citroen',               title: 'Citroën',               year: '2023', caption: 'Citroën Egypt — campaign work for the brand\'s local launch and follow-up models, balancing French quirk with regional clarity. — Sharp, modular OOH and digital. Built around the car\'s silhouette as the typographic anchor. The work earned a second look without trying to.', tags: ['Art Direction','Digital','OOH'], imgs: ['citroen.jpg','citroen-img1.jpg','citroen-img2.jpg','citroen-img3.jpg']},
  {slug: 'halwani-bros',          title: 'Halwani Bros',          year: '2023', caption: '"A quality we grew up with" — Halwani Bros\' awareness campaign celebrating heritage without leaning on nostalgia clichés. — Editorial photography, warm palette, restrained type. The campaign earned its emotion by trusting the audience to feel it without being told.', tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['halwani-bros.jpg','halwani-bros-img1.jpg','halwani-bros-img2.jpg','halwani-bros-img3.jpg','halwani-bros-img4.jpg','halwani-bros-img5.jpg','halwani-bros-img6.jpg']},
  {slug: 'moro',                  title: 'Moro',                  year: '2021', caption: '"Where are you going to put that energy?" — Moro\'s awareness campaign re-positioning the energy drink as the partner to ambition, not just stimulation. — High-contrast art direction, motion-led posters, on-ground takeovers. The campaign treated the drinker as someone with a goal, not just thirst.', tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['moro.jpg','moro-img1.jpg','moro-img2.jpg','moro-img3.jpg','moro-img4.jpg','moro-img5.jpg']},
  {slug: 'taiba-investments',     title: 'Taiba Investments',     year: '2024', caption: 'Brand campaign for Taiba Investments — translating long-term capital strategy into something visually trustworthy without being boring. — 3D-rendered hero scenes, geometric type lockups, a palette that signals stability with a hint of optimism. Built for boardroom and screen.', tags: ['Art Direction','3D Design','Creative Direction','360 Campaign'], imgs: ['taiba-investments.jpg','taiba-investments-img1.jpg','taiba-investments-img2.jpg','taiba-investments-img3.jpg','taiba-investments-img4.jpg']},
  {slug: 'haval',                 title: 'Haval',                 year: '2021', caption: 'Haval\'s launch campaign in Egypt — introducing the SUV brand to a market that already had its loyalties. — Bold automotive art direction with confident type and lifestyle photography. The campaign positioned the brand as a serious player from day one.', tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['haval.jpg','haval-img1.jpg','haval-img2.jpg','haval-img3.jpg','haval-img4.jpg','haval-img5.jpg','haval-img6.jpg']},
  {slug: 'derayah-financial',     title: 'Derayah Financial',     year: '2025', caption: 'Awareness campaign for Derayah\'s mobile investing app — positioning self-directed investing as approachable, not intimidating. — Clean app-first art direction, screenshot-led storytelling and a typographic system tuned for both phone and billboard. Built to convert as much as it informs.', tags: ['Art Direction','Creative Direction','360 Campaign'], imgs: ['derayah-financial.jpg','derayah-financial-img1.jpg','derayah-financial-img2.jpg','derayah-financial-img3.jpg','derayah-financial-img4.jpg','derayah-financial-img5.jpg','derayah-financial-img6.jpg']},
  {slug: 'derayah-financial-ksa', title: 'Derayah Financial KSA', year: '2025', caption: 'A full 360 campaign for Derayah Financial in Saudi Arabia — pushing the platform\'s investing-for-everyone story into mass market. — 3D viz of products and lifestyle moments, OOH-grade type, and social-first cut-downs. The system held together from billboard to in-feed.', tags: ['Art Direction','3D Viz','Creative Direction','360 Campaign'], imgs: ['derayah-financial-ksa.jpg','derayah-financial-ksa-img1.jpg','derayah-financial-ksa-img2.jpg','derayah-financial-ksa-img3.jpg','derayah-financial-ksa-img4.jpg']},
  {slug: 'general-court-of-audit',title: 'General Court of Audit',year: '2025', caption: 'Brand campaign for Saudi Arabia\'s General Court of Audit — translating government-grade transparency into something that doesn\'t look like a government ad. — Editorial type, considered photography, and a quiet confidence that earned trust without the usual heavy-handed imagery.', tags: ['Art Direction','Digital','OOH'], imgs: ['general-court-of-audit.jpg','general-court-of-audit-img1.jpg','general-court-of-audit-img2.jpg','general-court-of-audit-img3.jpg']},
]
