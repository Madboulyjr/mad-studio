import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {muxInput} from 'sanity-plugin-mux-input'
import {schemaTypes} from './schemas/index.js'

export default defineConfig({
  name: 'default',
  title: 'MAD Studio',

  projectId: 'f4pxr4lu',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
    muxInput(),
  ],

  schema: {
    types: schemaTypes,
  },
})
