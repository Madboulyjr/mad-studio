import test from 'node:test'
import assert from 'node:assert/strict'
import {escapeHtml, hasProjectMedia, externalProjectUrl, normalizeContent, musicPlatform} from '../src/content-utils.js'
import {projectRole} from '../src/editorial-copy.js'

test('empty work is withheld; external-only work remains available without changing CMS data', () => {
  const source = {sections:[{slug:'bubble'}],projects:[
    {slug:'draft',media:[]},
    {slug:'external',caseStudy:{externalUrl:'https://www.behance.net/gallery/123/work'}},
    {slug:'image',media:[{_type:'image',asset:{_ref:'image-id'}}]},
    {slug:'broken-video',media:[{_type:'videoItem'}]},
  ]}
  assert.deepEqual(normalizeContent(source).projects.map(p=>p.slug),['external','image'])
  assert.equal(source.projects.length,4)
  assert.equal(externalProjectUrl(source.projects[1]),'https://www.behance.net/gallery/123/work')
})
test('supported media count as ready, and unsafe external links do not', () => {
  for (const media of [{_type:'videoItem',playbackId:'abc'},{_type:'videoFile',fileUrl:'https://example.com/v.mp4'},{_type:'videoEmbed',url:'https://vimeo.com/123'}]) assert.equal(hasProjectMedia({media:[media]}),true)
  assert.equal(externalProjectUrl({caseStudy:{externalUrl:'javascript:alert(1)'}}),'')
  assert.equal(externalProjectUrl({media:[{_type:'image',asset:{}}],caseStudy:{externalUrl:'https://example.com'}}),'')
})
test('unavailable content produces a recoverable error',()=>{
  for (const value of [null,{}, {sections:[],projects:[]}]) assert.throws(()=>normalizeContent(value), /temporarily unavailable/)
})
test('quoted and HTML-like metadata remains complete and inert',()=>{
  assert.equal(escapeHtml('"A & B" <script> $1'), '&quot;A &amp; B&quot; &lt;script&gt; $1')
})
test('release destinations use their real platform labels',()=>{
  assert.equal(musicPlatform('https://www.deezer.com/album/123'),'Deezer')
  assert.equal(musicPlatform('https://music.apple.com/album/123'),'Apple Music')
  assert.equal(musicPlatform('https://open.spotify.com/track/123'),'Spotify')
})
test('editorial revision preserves confirmed results, credits and source content', () => {
  const outcome = [{metric:'12M',label:'Reach'},{metric:'+42%',label:'Awareness'},{metric:'8',label:'Weeks'}]
  const project = {slug:'biolab',sectionSlug:'originals',caption:'Original copy',media:[{_type:'image',asset:{_ref:'image-id'}}],caseStudy:{role:'Art Direction & Creative Direction',agency:'Original agency',outcome}}
  const source = {sections:[{slug:'originals'}],projects:[project]}
  const before = structuredClone(source)
  const revised = normalizeContent(source).projects[0]
  assert.deepEqual(revised.caseStudy.outcome, outcome)
  assert.equal(revised.caseStudy.agency, project.caseStudy.agency)
  assert.equal(revised.caseStudy.role, project.caseStudy.role)
  for (const key of ['problem','idea','approach']) assert.ok(revised.caseStudy[key])
  assert.ok(revised.caseStudy.deliverables.length)
  assert.deepEqual(source, before)
})
test('roles follow existing disciplines, and new case stories do not invent results', () => {
  assert.equal(projectRole({tags:['Creative Direction']}),'Art Direction · Creative Direction')
  assert.equal(projectRole({tags:['3D Visualisation']}),'Art Direction · Visualisation')
  assert.equal(projectRole({tags:[]}), 'Art Direction')
  assert.equal(projectRole({tags:['3D'],caseStudy:{role:'Lead Art Director'}}),'Lead Art Director')
  const source = {sections:[{slug:'originals'}],projects:[{slug:'google-arabia',sectionSlug:'originals',tags:['Creative Direction'],media:[{_type:'image',asset:{_ref:'image-id'}}]}]}
  const revised = normalizeContent(source).projects[0]
  assert.equal(revised.caseStudy.role,'Art Direction · Creative Direction')
  assert.equal(revised.caseStudy.outcome,undefined)
  assert.equal(revised.caseStudy.outcomes,undefined)
})
