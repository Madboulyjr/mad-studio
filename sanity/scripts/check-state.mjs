#!/usr/bin/env node
/** Read-only verification — confirms all content is present + case-study fields. */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({path: path.resolve(__dirname, '../../.env.local')})

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const data = await client.fetch(`{
  "sectionsCount": count(*[_type == "section"]),
  "projectsCount": count(*[_type == "project"]),
  "publishedCount": count(*[_type == "project" && published == true]),
  "withCaseStudy": count(*[_type == "project" && defined(caseStudy.role)]),
  "withOutcome": count(*[_type == "project" && defined(caseStudy.outcome) && length(caseStudy.outcome) > 0]),
  "biolab": *[_type == "project" && slug.current == "biolab"][0]{title, "hasRole": caseStudy.role, "outcomeCount": count(caseStudy.outcome)}
}`)

console.log('\n  Sanity dataset state:\n')
console.log(`    Sections:            ${data.sectionsCount}`)
console.log(`    Projects total:      ${data.projectsCount}`)
console.log(`    Published:           ${data.publishedCount}`)
console.log(`    With case-study:     ${data.withCaseStudy}`)
console.log(`    With outcome data:   ${data.withOutcome}`)
console.log()
console.log('  BIOLAB sample:')
console.log(`    title:         ${data.biolab?.title || '(missing)'}`)
console.log(`    role:          ${data.biolab?.hasRole || '(unset)'}`)
console.log(`    outcome rows:  ${data.biolab?.outcomeCount ?? 0}`)
console.log()
