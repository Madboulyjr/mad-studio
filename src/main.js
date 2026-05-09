import {fetchContent, urlFor} from './sanity-client.js'
import {inject as injectAnalytics} from '@vercel/analytics'

/* Vercel Analytics — only fires on the production beingmad.co host.
   In dev / preview deploys it stays silent so we don't pollute stats. */
if (typeof window !== 'undefined' && window.location.hostname === 'beingmad.co') {
  injectAnalytics()
}

/* Lazy-load @mux/mux-player only when a video is actually rendered.
   Saves ~85KB gzip on first paint (most landing visits never need it). */
let muxLoaded = null
function ensureMux() {
  if (!muxLoaded) muxLoaded = import('@mux/mux-player')
  return muxLoaded
}

/* Lazy-load the admin editor module — only fetched when /admin is hit. */
let adminMod = null
async function openAdmin(sub) {
  if (!adminMod) adminMod = await import('./admin.js')
  await adminMod.mountAdmin(sub)
}
function closeAdmin() {
  if (adminMod) adminMod.unmountAdmin()
}

/* ─── NAV CARD ICONS (not yet in Sanity, kept inline) ──────────────────────── */
const ICONS = {
  originals: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="64.15 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M397.04,127.31c-5.99,3.03-7.95,6.02-10.64,11.82l-7.56,16.29c-2.38,5.14-5.22,9.81-8.34,14.49c-2.67,3.99-3.06,8.75-1.33,13.17c1.85,4.73,5.63,6.54,10.52,7.28c0.89,0.13,1.42,0.71,1.3,1.54c-0.12,0.78-0.85,1.29-1.7,1.12c-2.27-0.45-4.46-0.94-6.51-2.02c-2.78-1.46-4.8-3.82-6.01-6.73c-2.19-5.29-1.56-11.23,1.63-16.04c3.41-5.13,6.33-10.31,8.95-15.91l8.11-17.37c1.14-2.45,2.81-4.58,4.78-6.34c1.9-1.69,4.06-2.86,6.29-4.03l9.59-4.99c0.7-0.36,1.21-1.15,1.73-1.7l1.7-1.8c-0.99-1.02-1.97-2.23-2.49-3.65c-0.81-2.18-1.81-4.22-2.41-6.48c-0.94-3.55,0.07-7.34-1.46-11.47c-0.82-2.21-1.03-4.45-0.72-6.85l-1.89-0.71c-5.69-1.83-10.87-4.73-15.22-8.82c-3.69-3.47-7.3-8.39-7.19-13.52c0.05-2.09,1.12-4.07,3.06-4.89c3.24-1.37,6.56,1.32,9.33,3.48c3.5,2.74,7.45,4.58,11.93,5.23l2.33-7.56c1.26-4.08,2.42-8.04,3.95-12.01c0.72-1.71,1.44-3.3,2.57-4.72c1.83-2.31,4.93-2.67,7.27-0.88c3.71,2.84,5.88-1.48,10.01-1.63c2.05-0.07,4.07,0.67,5.78,1.8l7.89,5.25c2.09,1.51,3.62,3.59,3.95,6.19l0.79,6.14c3.91-1.07,7.9-1.35,11.91-0.67c7.95,1.36,13.81,8.38,11.46,16.39c-0.59,2.02-1.64,3.83-3,5.48c-4.66,5.66-11.97,8.58-19.12,9.5c-0.99,2.22-2.15,4.31-4.01,5.77c-0.55,0.43-0.98,0.77-1.22,1.45c-0.89,3.04-1.25,6.15-1.06,9.27c0.67,0.42,1.38,0.9,1.83,1.46l2.86,3.64c0.63,0.8,1.06,1.68,1.33,2.74l9.69,6.65l9.68,6.9c2.37,1.69,5.03,5.65,6.13,8.45c2.57,6.52,3.88,13.36,3.88,20.45l0.03,39.41c0,3.96-3,7.22-7.04,7.22l-60.29,0.02c-0.56,0-1.22-0.54-1.22-1.07l-0.03-24.53l0.3-6.48l-3.97-9.18l-7.98-18.69c-0.21-0.5-0.1-1.28,0.23-1.66l5.11-5.88l-4.7-2.22c-0.84-0.4-1-1.37-0.51-2.12l5.86-9.09L397.04,127.31z M438.07,63.86l6.37-2.2l-0.78-6.45c-0.2-1.63-1.2-2.82-2.33-3.97l-4.44-3.04c-1.71-1.17-3.39-2.31-5.21-3.27c-1.8-0.94-3.63-0.78-5.43,0.12l-2.92,1.47c-2.18,0.8-4.34,0.31-6.13-1.08c-0.76-0.59-1.86-1.02-2.75-0.47c-1.04,0.63-1.73,1.69-2.25,2.82c-1.94,4.24-3.37,8.59-4.54,13.13C418.3,58.96,428.16,60.41,438.07,63.86z M402.24,79.6l0.59-5.02c-0.04-1.59,1.18-2.57,2.8-3.01c-5.62-0.7-10.47-1.78-15.21-5.22l-4.8-3.49c-0.95-0.69-2.39-1.12-3.46-0.62c-2.03,0.94-1.42,4.63-0.18,7.09c2.84,5.67,8.11,9.91,13.72,12.76c2.27,1.15,4.58,1.93,7.02,2.83C402.31,83.05,402.03,81.44,402.24,79.6z M448.24,84.9c0.47,1.34,0.71,2.59,0.76,3.99c7.34-1.07,15.91-5.25,18.59-12.17c1.51-3.89,0.48-7.96-2.63-10.68c-4.94-4.32-11.8-3.92-18.01-2.33l-9.07,3.09c-3.89,1.33-7.65,2.62-11.59,3.59c5.58,0.82,10.7,2.17,15.65,4.53c2.9,1.53,6.01,2.95,6.54,6.26L448.24,84.9z M433.98,65.36c-8.65-2.8-18.31-3.55-27.23-1.54l-1.47,4.9C415.29,69.89,424.47,68.76,433.98,65.36z M419.01,95.7l3.18,1.2c2.02,0.76,3.47,2.28,4.61,4.24c0.94-1.65,1.58-3.45,3.12-4.48c2.25-1.51,4.04-3.3,5-5.95c0.91-2.51,1.19-5.26,0.81-7.97c-0.24-1.71-2.25-3.27-2.22-5.17l0.06-2.96c-8.65-2.37-17.87-3.07-26.51-0.83c-0.53,0.14-1.12,0.44-1.54,0.74l-0.62,5.13c2.36-1.04,4.84-1.16,7.08-0.07c1.94,0.95,2.88,2.9,2.5,5.05l-1.67,9.49c0.38,1.09,1.73,1.58,2.71,0.86l1.78-0.64c0.27-0.1,1.03,0.02,1.16,0.27L419.01,95.7z M445.76,83.01c0.43-1.65-0.33-3.06-1.72-3.94c-2.56-1.62-5.3-2.85-8.08-3.71c-0.27,1.66,0,2.9,0.88,4.07c1,1.34,1.45,2.89,1.47,4.58l0.04,3.34C440.02,84.15,442.47,82.07,445.76,83.01z M411.1,96.2c-0.77-1.1-0.93-2.04-0.66-3.07l1.66-9.1c0.17-0.94-0.36-1.81-1.18-2.17c-2.03-0.88-4.32-0.49-6.04,0.86c0.64,1.66,0.62,3.12,0.28,4.73c-0.43,2.02-0.23,4.04,0.47,5.98l1.88,5.2C408.63,97.51,409.77,96.84,411.1,96.2z M445.28,91.98c1.28-2.49,1.51-5.72-0.16-6.43c-2.18-0.92-4.23,1.74-4.55,3.77l-1.04,6.57C441.7,97.07,444.09,94.28,445.28,91.98z M406.63,102.81c0.05,1.11,0.26,2.36,0.71,3.46l2.09,4.99c1.13,2.71,3.33,4.58,6.2,5.15c4.37,0.87,8.38-0.68,11.47-3.76l6.37-6.36c1.83-1.83,2.59-4.23,2.96-6.76l1.42-9.91c-0.94,2.64-1.95,5.12-4.05,7.06c-0.98,0.9-2.19,1.6-3.08,2.57c-2.05,2.24-1.81,5.41-3.45,5.59c-1.74,0.19-2.27-3.47-4.84-5.15c-1.89-1.23-4.24-1.97-6.5-2.05l-2.48,0.32c-1.24,0.16-2.48,0.85-3.47,1.59C408.26,100.83,408.31,103,406.63,102.81z M434.9,119.44c1.55-1.58,2.57-3.59,3.54-5.55c0.78-1.58,0.95-3.26,0.89-5c-0.12-3.46,0.16-6.73,0.99-10.05l-1.14-0.29l-0.92,4.64c-0.34,1.73-1.49,3.11-2.53,4.55l-7.31,7.24c-3.35,3.32-7.82,4.84-12.6,4.08l0.28,3.59c0.06,0.75,0.42,1.85,1.05,2.3C421.74,128.25,431.16,123.27,434.9,119.44z M435.81,145.46l-2.76-8.07c-0.19-0.89,0.3-1.72,1.21-1.8l9.37-1.41l1.68-16.83c0.1-1-0.17-1.79-0.77-2.56l-2.52-3.19c-0.74,2.65-1.64,4.72-3.05,6.88l-10.12,15.55c-3.67,5.65-7.01,11.26-10.02,17.3c-2.5,5.02-4.57,10.04-5.79,15.42l2.41-2.86c4.06-4.41,8.37-8.41,12.98-12.26L435.81,145.46z M399.91,144.68l6.1,14.32l3.9,9.02l1.88-6.91c-1.11-5.21-1.91-10.26-2.21-15.6c-0.51-9.33,0.4-18.46,2.87-27.4c-0.52-0.35-1.15-0.18-1.51,0.27c-1.6,1.94-3.18,3.8-4.56,5.93l-6.04,9.27l4.88,2.37c0.3,0.14,0.69,0.72,0.73,1.03c0.04,0.31-0.18,0.97-0.42,1.24L399.91,144.68z M411.5,177.9l0.04,24.52l35.39-0.01l-0.03-38.82c0-4.81,0.63-9.33,1.78-13.95c2.46-8.35,7.39-16.5,16.22-18.59l-9.84-6.93l-7.3-5l-1.58,16.46c-0.18,0.56-0.71,1.06-1.28,1.14l-8.86,1.35l2.37,6.73c0.4,1.13,0.21,2.11-0.96,2.74c-5.68,4.72-11.26,9.38-16.58,14.52c-2.44,2.35-4.57,4.73-6.51,7.46C412.69,172.07,411.64,174.76,411.5,177.9z M428.49,129.74l2.73-4.3c-2.63,1.56-5.28,2.65-8.29,3.1c-4.12,0.47-8.03-0.31-9.25-4.35c-2.16,10.44-2.05,21.79-0.1,32.21C417.68,146.84,422.87,138.34,428.49,129.74z M474.81,197.6l0.01-33.46l-0.42-11.4c-0.63-6.32-2.62-14.36-6.7-19.23l-2.69,0.27c-3.38,0.93-6.26,2.94-8.42,5.73c-5.35,6.9-7.02,16.1-7.01,24.84l0.02,38.07l21.04-0.08C473.24,202.33,474.81,200.08,474.81,197.6z"/><rect x="386.21" y="151.63" fill="currentColor" width="2.71" height="53.54"/><path fill="currentColor" d="M428.59,82.6c-2.95-1.69-6.07-2.01-9.08-0.4c-0.57,0.3-1.31,0.27-1.72-0.2c-1.99-2.34,6.47-5.56,12.35-1.35c0.53,0.38,0.6,1.2,0.3,1.65C430.01,82.97,429.27,83,428.59,82.6z"/><path fill="currentColor" d="M421.05,109.19c-3.8,1.21-3.28-2.3-5.2-2.31c-1.55-0.01-1.2,1.88-2.79,2.23c-0.77,0.17-1.79-0.01-2.3-0.6c-0.75-0.86-1.53-1.91-1.76-3.12c-0.21-1.07,0.51-2.88,1.38-3.53c2.62-1.93,7.98-1.36,11.19-0.14c1.15,1.1,1.98,2.38,2.46,3.93C423.58,107.25,422.53,108.6,421.05,109.19z M418.32,105.2l1.19,1.96c0.85,0.06,1.82-0.72,1.93-1.58c0.07-0.55-0.67-1.62-1.2-1.84c-2.1-0.85-6.34-1.29-8.29-0.17c-0.32,0.26-0.78,1.21-0.64,1.59c0.21,0.58,0.64,1.23,1.06,1.83l0.98-1.72C413.81,104.51,416.98,104.4,418.32,105.2z"/></svg>`,
  bubble: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="516.1 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M849.32,172.63c-3.91,8.12-5.36,16.83-5.13,25.69c0.03,1-0.67,1.54-1.61,1.54l-19.41,0c-0.84,0-1.48-0.68-1.44-1.54c0.74-17.22,3.61-36.78,10.82-52.49c3.42-7.44,8.01-14.14,13.98-19.7l2.68-2.29c-0.12-3.36-0.7-6.74-1.65-10.03l-1.27-3.36c-5.45,1.1-10.74-0.17-13.36-5.25c-2.01-3.92-3.6-7.97-4.75-12.25c-0.99-3.69-1.04-7.47-0.13-11.13c0.29-1.18,0.39-2.2,0.11-3.37c-0.39-1.62-0.4-3.22-0.31-4.91c0.46-1.78,0.99-3.45,1.62-5.12c-0.33-1.33-0.31-2.68,0.03-4c0.93-3.12,2.6-5.75,4.68-8.21c4.11-4.85,9.38-7.66,15.82-8.42c2.99-2.63,6.78-4.1,10.86-4.36c6.32-6.37,16.32-5.4,23.66-1.1c4.79,2.81,10.9,9.66,12.07,14.7l3.36,14.55l14.3,64.82c0.79,3.6-0.59,6.9-4.62,7.68l-4.73,0.35c0.96,2.86,0.03,5.56-2.64,6.77c3.81,11.1,6.33,22.41,7.99,34.03l1.5,12.83c0.11,0.98-0.44,1.81-1.53,1.81l-15.41-0.01c-0.68,0-1.29-0.6-1.31-1.25c-0.46-13-1.99-29.05-10.41-39.41c-4.05-4.99-9.82-8.38-16.29-9.08c-5.37-0.58-10.59,0.92-15.08,3.76c-7.96,5.02-13.12,13.79-16.76,22.36c-2.76,6.75-4.64,13.67-5.92,20.91l12.4,0c0.09-3.85,0.25-7.55,0.96-11.3c0.83-4.95,2.23-9.55,4.41-14.04c0.31-0.6,0.98-0.85,1.52-0.75C848.76,171.14,849.63,171.97,849.32,172.63z M869.17,44.58c1.41-1.36,3.21-2.12,5.02-2.85c-3.26-0.43-6.45,0-9.13,1.81L869.17,44.58z M909.25,141.45c1.31-0.06,2.86-1.63,2.56-3.02l-1.91-8.86L898,75.31l-2.74-12.36c-0.46-2.06-0.81-4.07-1.55-6.03c-1.86-4.94-7.55-11.44-12.69-13.26c-3.08-0.2-6.3,0.31-9.06,2.12c4.51,2.26,8.21,5.2,11.29,8.95c1.01-1.18,2.23-1.58,3.58-1.22c3.45,0.9,5.11,5.09,5.66,8.67l2.77,18.26l9.33,61.24L909.25,141.45z M883.81,61.71c0-0.88-0.35-1.89-0.81-2.61c-3.69-5.84-9.22-10.24-15.84-12.29c-4.04-1.25-8.25-1.06-12.14,0.8c11.87,1.15,23.08,8.67,28.81,19.09L883.81,61.71z M868.8,82.14l6.63,6.76c0.92,0.94,1.48,1.96,1.72,3.4c1.56-0.79,2.72-2.04,3.7-3.52c-2.61-6.78-6.56-12.83-11.77-17.89c-0.62-0.6-0.75-1.37-0.14-2c0.5-0.51,1.25-0.56,1.9,0.05c4.99,4.75,8.84,10.32,11.69,16.82c2.17-4.11,2.12-9.81,0.52-14.18c-1.37-3.74-3.5-6.92-6.13-9.96c-5.01-5.41-11.51-9.21-18.75-10.78c-6.55-1.42-13.2-0.2-18.71,3.96c9.91,0.21,18.07,3.62,26.01,9.32c0.46,0.69,0.44,1.5-0.07,1.99c-0.51,0.5-1.25,0.36-1.84-0.05c-8.39-5.93-16.63-9.02-26.98-8.53c-2.25,2.49-3.99,5.21-4.77,8.59c2.45-1.38,4.9-1.96,7.61-1.72c3.5,0.28,6.71,1.34,9.89,2.82c4.37,2.19,8.26,4.89,11.98,8.04C863.92,77.48,866.34,79.62,868.8,82.14z M900.68,148.84c1.43-0.32,2.03-1.35,1.82-2.74l-6.17-40.99l-3.08-20.18l-3.36-22.17c-0.36-2.35-1.06-4.55-2.76-6.15c-0.58-0.54-1.43-0.78-2.04-0.15c0.79,1.69,1.3,3.58,1.36,5.59l0.53,18.26l1.34,36.37l1.13,30.65c0.03,0.88,0.35,1.54,1.32,1.7C894,149.53,897.38,149.58,900.68,148.84z M831.02,93.16c1.09,3.71,2.47,7.08,4.1,10.44c2.44,5.03,7.21,4.96,12.27,3.91c4.22-0.88,8.24-2.13,11.96-4.29c3.28-1.9,5.7-4.57,7.32-7.98c0.27-0.57,0.99-0.93,1.57-0.83c0.43,0.07,0.94,0.65,1.23,1.12l3.23-0.65c1.15-0.23,1.57-2.03,1.68-3.03l-1.68-1.98l-0.83,1.68c-0.37,0.75-0.91,1.09-1.81,0.86c-0.53-0.13-1.11-0.98-0.77-1.66l1.43-2.91l-3.38-3.37c-6.02-6-13.23-12.33-21.07-15.6c-4.39-1.83-10.95-3.11-14.02,0.52c-1.12,1.32-1.43,3.26-1.68,4.97c2.77-0.79,5.57-0.3,7.44,1.75c1.48,1.62,1.76,3.86,1.44,6c-0.45,2.53-1.04,4.88-1.82,7.36l-0.02,1.12l3.21,0.57c0.71,0.12,1.23,0.53,1.33,1.17c0.07,0.51-0.32,1.43-1,1.43c-3.06,0-6.87-1.05-6.27-3.73l0.61-2.72c0.92-2.88,2.28-7.67,0.55-9.4c-1.47-1.47-3.7-1.67-5.49-0.67c0.73,1.86,0.54,3.47,0.1,5.23C829.81,85.97,829.95,89.55,831.02,93.16z M876.31,111.3c3.26-0.67,6.77-1.13,9.19,0.73l-0.92-24.26c-1.72,3.44-4.1,6.08-7.48,7.59l-1.53,0.84c1.8,1.4,2.68,3.3,2.46,5.53c-0.19,1.96-1.31,3.83-3.35,4.78C875.07,108.18,875.54,109.76,876.31,111.3z M875.36,101.08c0-1.83-1.48-3.31-3.31-3.31s-3.31,1.48-3.31,3.31c0,1.83,1.48,3.31,3.31,3.31S875.36,102.91,875.36,101.08z M851.78,121.84c6.59-4.55,13.91-7.73,21.8-9.87c-0.63-1.59-1.15-3.14-1.5-4.85c-3.28,0-5.85-2.45-6.09-5.92c-4.66,5.09-10.51,7.12-16.96,8.76l1.5,4.45C851.1,116.85,851.47,119.22,851.78,121.84z M894.88,182.46c0.73,4.99,1.04,9.73,1.27,14.7l12.77,0c-1-11.77-3.01-23.19-5.96-34.55l-3.33-10.78c-3.3,0.35-6.41,0.41-9.49-0.19c-2.11-0.41-3.41-1.94-3.37-4.11l-1.03-28.23c-12.33,0.26-23.98,7.39-32.81,15.38c-6.38,6.04-11.51,13.05-14.99,21.09c-0.31,0.72-1.35,0.75-1.78,0.49c-0.7-0.42-0.93-1.08-0.58-1.85c4.61-10.33,11.73-19.18,20.72-26.06c7.96-6.08,18.15-11.33,28.42-11.69c0.24-1.57-0.82-3.03-2.53-3.18c-1.85-0.16-3.72,0.03-5.59,0.47c-5.77,1.37-11.24,3.36-16.53,6.07c-9.42,4.81-16.08,11.31-21.56,20.31c-9.7,15.95-13.08,38.28-14.07,56.81l1.86-0.02c2.9-17.03,10.73-39.35,27.12-47.24c3.39-1.63,7-2.44,10.78-2.54c7.46-0.18,14.96,3.4,19.9,8.91c3.48,3.88,5.88,8.44,7.63,13.38C893.25,173.81,894.11,177.95,894.88,182.46z"/></svg>`,
  music: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="968.05 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M1393.24,136.47l-3.1,1.62l1.02,1.78c0.39,0.68,0.33,1.57-0.24,1.97c-0.73,0.51-1.71,0.33-2.16-0.44l-1.17-1.98l-3.12,1.62l1.09,1.88c0.37,0.64,0.21,1.53-0.34,1.91c-0.64,0.44-1.63,0.36-2.06-0.38l-1.17-1.99c-0.65,0.31-1.39,0.66-1.96,0.62l-4.66-0.32l-4.51,2.62l0.43,6.93l-0.15,39.7c-0.01,3.43-3.5,6.42-6.9,6.43l-47.11,0.08c-0.95,0.51-1.81,0.65-2.94,0.55c-3.81,6.58-10.26,11.27-18.02,11.92c-4.9,0.41-9.57-1.49-13.27-4.57c-6.28-5.22-10.5-13.4-13.2-21.05c-5.25-0.19-9.33-1.57-12.85-5.48c-1.33-1.93-2.3-3.94-2.91-6.21c-2.28-10.61,4.44-19.02,13.32-24.2c1.46-13.37,5.77-25.74,16.68-34.17l0.99-21.54l1.29-27.64c0.31-4.59,2.45-8.4,5.53-11.72c0.75-1.53,1.39-3.19,2.26-4.73c2.42-4.29,6.04-7.52,10.71-9.31c8.73-3.35,18.74-1.57,25.75,4.62c3.54,3.13,5.99,6.95,7.59,11.36c1.35,3.72,1.82,7.37,2.3,11.32l3.81,31.05c0.19,1.51,0.55,2.75,1.35,4l6.82,10.64c3.87,2.45,6.97,5.57,9.69,9.23l2.78,4.25c1.5,2.29,2.45,4.69,3.36,7.32l1.7-0.94l2.06-4.19c0.31-0.62,1.15-1.16,1.79-1.63l-1.14-2c-0.35-0.61,0.03-1.55,0.53-1.84c0.74-0.43,1.59-0.12,2,0.61l1.01,1.77l2.98-1.87l-1.1-1.94c-0.41-0.72-0.1-1.61,0.59-1.99c0.72-0.4,1.55-0.11,2.01,0.7l0.94,1.64l3-1.87l-1.03-1.68c-0.38-0.63-0.31-1.44,0.15-1.89c0.49-0.47,1.57-0.58,1.95,0l1.32,2l1.41-0.81c0.87-0.5,2.32-0.78,3.17-0.04l3.96,3.48c1.31,1.15,2.05,2.57,2.37,4.25l0.95,5.02c0.22,1.19-0.07,2.55-1.2,3.18l-1.81,1.01l1.04,1.83c0.34,0.59,0.1,1.41-0.43,1.79c-0.49,0.34-1.52,0.32-1.9-0.29L1393.24,136.47z M1324.33,56.55l10.65,0.02c-1.73-4.35-4.42-8-8.08-10.79c-4.3-3.02-9.47-4.54-14.71-4.19c-1.78,2.04-2.9,4.28-3.55,6.96c2.66,0.33,5.21,0.79,7.72,1.8C1319.56,51.72,1322.23,53.73,1324.33,56.55z M1305.78,48.67c0.34-2.47,1.31-4.34,2.4-6.41c-5.08,1.26-9.33,4.34-11.7,9.03C1299.55,49.78,1302.48,49.03,1305.78,48.67z M1320.48,56.54c-2.39-2.54-5.31-3.85-8.49-4.56c-4.7-1.07-9.49-0.49-13.78,1.67c-1.19,0.6-1.96,1.54-2.2,2.9L1320.48,56.54z M1300.17,94.54c-1.86-1.69-3.59-3.34-4.87-5.44c-2.71-4.46-3.21-10.87-3.21-16.18l0-7.87l0.36-5.63c-0.25-0.06-0.98-0.03-1.17,0.14c-1.27,1.86-2.02,4.17-2.23,6.56l-2.15,46.92c3.6-2.16,7.27-3.96,11.25-5.34c2.33-1.68,4.61-3.05,7.19-4.37l-0.23-5.62C1303.11,97.12,1301.69,95.92,1300.17,94.54z M1294.89,69.33l0.02,5.94c0.01,2.95,0.57,5.82,1.32,8.63c0.66,2.47,1.85,4.6,3.67,6.35l3.15,3.02c6.83,6.54,21.73-4.32,21.77-12.26l0.06-13.62c0.01-2.87-0.81-5.55-2.19-8l-27.36-0.01c-0.47,2.75-0.51,5.16-0.42,7.83c1.8-1.55,4.04-2.01,6.31-1.5c2.53,0.51,4.13,2.51,4.3,5.09c0.03,3.24-0.19,6.28-0.5,9.62c1.54,1.07,3.65-0.35,4.1,1.37c0.17,0.66-0.19,1.44-0.96,1.65c-1.24,0.35-2.63,0.28-3.81-0.18c-1.41-0.55-2.19-1.81-2.04-3.34c0.29-2.99,0.49-5.92,0.45-8.91c-0.02-1.5-1.15-2.47-2.54-2.63C1297.05,68.02,1296.7,70.4,1294.89,69.33z M1343.13,104.38c-1.15-1.81-1.59-3.47-1.85-5.54l-3.95-31.98c-0.21-2.6-0.6-4.92-1.32-7.48l-9.98,0c1.02,2.54,1.59,4.77,1.69,7.4l0.02,54c6.87-4,13.13-6.88,21.11-7.43L1343.13,104.38z M1289.49,122.04c2.03,2.67,4.43,4.37,7.24,5.63c2.95,1.24,5.94,1.94,9.13,2.38c3.42,0.37,6.75,0.44,10.13,0.19c2.82-2.75,5.69-5.11,8.88-7.43l0.01-34.09c-4.32,5.12-10.16,9.51-16.94,9.37l0.24,6.01c0.03,0.77-0.59,1.42-1.29,1.66C1299.35,109.28,1293.69,114.86,1289.49,122.04z M1268.08,161.83c2.51-1.11,5.1-1.49,7.87-1.27c2.38-1.77,4.94-3.13,7.92-3.89c-1.11-3.83-1.77-7.59-2.21-11.63c-0.53-5.96,0.2-11.84,2.09-17.52c1.83-5.22,4.7-9.66,8.25-14.04c-8.72,4.39-15.06,11.89-18.43,20.87c-1.95,5.2-2.94,10.51-3.5,16.04c-0.07,0.48-0.33,1-0.74,1.22c-4.4,2.36-8.14,5.61-10.73,9.89c-2.7,4.46-3.08,9.98-0.71,14.57c1.08,2.08,2.53,3.79,4.75,4.76C1258.7,173.99,1260.98,165.31,1268.08,161.83z M1328.23,135.7c-4.33,2.19-7.66,4.92-11.13,7.71c-0.6,0.71-1.61,0.66-2.12,0.14c-0.62-0.63-0.5-1.54,0.16-2.12c12.2-10.68,28.21-17.31,44.78-16.8c-2.43-3.37-5.18-6.17-8.62-8.39c-5.13-0.32-11.23,1.45-15.97,3.75c-15.08,7.34-26.3,20.08-32.54,35.72c1.29-0.44,2.33-1.29,3.25-2.29l3.26-3.55c3.09-3.36,7.39-5.03,11.93-4.55L1328.23,135.7z M1380.02,140.22l16.09-8.46l-1.11-5.75c-0.21-0.76-0.63-1.45-1.21-1.99l-3.86-3.53l-15.41,9.77l-1.95,3.8l3.34,5.94L1380.02,140.22z M1299.39,156.32l3.8-8.52c2.73-5.21,5.96-9.91,9.93-14.55c-9.02,0.05-18.92-1.41-25.13-8.44l-1.08,2.28c-3.69,9.84-3.06,18.92-0.22,28.93c2.59-0.39,4.86-0.32,7.35-0.12L1299.39,156.32z M1351.83,133.89c4.4-0.54,8.62-0.31,13.2,0.42c-0.84-2.5-1.86-4.58-3.19-6.78c-8.97-0.58-17.8,1.05-26.12,4.47c-3.3,3.24-6.2,6.59-8.85,10.32l-2.65,3.73c1.95,0.88,3.68,1.82,5.05,3.35l3.61,4.05C1334.04,143.29,1341.96,135.43,1351.83,133.89z M1323.84,169.95l49.27-29.1l-2.65-4.78l-49.68,28.53C1322.36,166.1,1323.25,167.92,1323.84,169.95z M1336.04,152.6l27.23-15.61c-9.2-1.46-17.61-0.44-23.46,7.03C1337.84,146.54,1336.29,149.43,1336.04,152.6z M1355.34,195.63l8.84-0.07c2.21-0.02,3.76-1.8,4.22-3.91l-0.01-37.85l-0.28-6.75l-29.33,17.35c1.55,3.48,2.34,7.01,2.31,10.7c4.13,0.32,7.58,2.12,10.34,4.89C1355.4,183.71,1356.92,190.4,1355.34,195.63z M1291,167.38l2.14,0.27c3.54,0.69,6.8,1.66,10.37,2.84c0.45-3.28,2.66-5.89,5.07-7.34c3.19-1.91,6.58-1.56,9.7-0.43l12.58-7.12c-1.84-2.57-3.75-4.8-6.42-6.3c-4.1-2.29-9.34-1.52-12.52,1.92l-3.88,4.2c-2.28,2.47-5.28,3.92-8.7,3.67l-6.16-0.45c-4.69-0.34-9.21,0.36-13.27,2.73c1.81,0.66,3.44,1.23,4.97,2.18L1291,167.38z M1283.93,181.75c-1.11-2.04-1.38-3.63-1.28-5.52c0.27-3.15,1.62-6.06,4.44-7.88l-4.18-2.62c-2.97-1.63-6.24-2.43-9.63-2.29c-3.6,0.15-6.67,2.01-8.43,5.21c-1.65,3-1.66,6.74-0.23,9.81c1.24,2.68,3.72,4.22,6.66,4.05L1283.93,181.75z M1317.51,178.62c2.05-1.25,3.34-3.38,3.61-5.64c0.28-2.4-0.56-4.82-2.39-6.45c-2.28-2.03-5.38-2.54-8.23-1.22c-2.34,1.08-4.15,3.55-4.23,6.32C1310.46,173.42,1314.15,175.68,1317.51,178.62z M1330.44,184.34c4.42-1.48,7.5-5.13,7.8-9.73c0-3.05-0.76-5.89-1.88-8.79l-12.38,7.28c-0.32,3.02-1.8,5.68-4.27,7.42l4.95,4.85L1330.44,184.34z M1309.88,185.93l9.64,8.5c0.53,0.46,1.39,0.46,1.74,0.04c0.32-0.39,0.32-1.29-0.1-1.67l-10.16-8.96c-0.64-0.56-0.66-1.47-0.22-1.99c0.53-0.61,1.47-0.67,2.1-0.11l8.54,7.61c0.47,0.42,1.17,0.35,1.52-0.02c0.25-0.26,0.33-1.17,0.01-1.53c-4.47-5.01-10.92-10.69-17.1-13.28c-4.81-2.02-9.66-3.59-14.86-4.26c-1.76-0.23-3.45,1.1-4.33,2.49c-1.75,2.79-1.55,6.4,0.74,8.71l4.35-0.16l7.23,7.93c2.66,2.92,5.83,5.26,9.83,6.28l-4.42-4.02c-0.6-0.55-0.78-1.35-0.29-2c0.31-0.41,1.23-0.8,1.76-0.34l7.66,6.63c0.31,0.27,1.09,0.5,1.45,0.5c0.45,0,0.89-0.32,1.3-0.93l-8.56-7.59c-0.62-0.55-0.47-1.62,0.03-2.05C1308.42,185.12,1309.15,185.29,1309.88,185.93z M1323.84,195.62l28.43,0c1.86-5.11,0.46-10.81-3.62-14.32c-2.36-2.03-5.02-3.23-8.14-3.41c-1.43,4.57-4.96,7.88-9.54,9.2l-5.03,0.93c0.25,1.73-0.49,3.21-1.98,4.04C1324.45,193.31,1324.29,194.47,1323.84,195.62z M1292.42,186.54c-0.48-0.86-1.08-1.57-1.77-2.23l-1.89,0.13l4.86,8.81l1.98-1.03L1292.42,186.54z M1298.78,193.13c-0.14,0.23-0.47,0.78-0.71,0.91l-4.19,2.3c-0.86,0.43-1.75,0.13-2.14-0.71l-6.18-11.11l-12.92,0.8c1.54,4.07,3.26,7.56,5.35,11.08c1.74,2.61,3.54,5.04,5.81,7.16c5.15,4.56,10.97,5.99,17.43,3.36c4.16-1.69,7.61-4.54,9.91-8.41C1306.7,198.75,1302,195.85,1298.78,193.13z"/><path fill="currentColor" d="M1318.39,69.51c-2.31-1.55-5.26-2-7.58-0.49c-0.76,0.49-1.59,0.71-2.17,0.03c-0.54-0.63-0.49-1.62,0.26-2.17c3.41-2.49,7.67-1.91,11.24,0.35c0.76,0.48,0.86,1.44,0.42,2.05C1320.04,69.97,1319.23,70.08,1318.39,69.51z"/><path fill="currentColor" d="M1380.66,137.94c-0.68,0.36-1.54-0.14-1.78-0.6c-0.26-0.51-0.17-1.52,0.49-1.87l11.4-6.04c0.64-0.34,1.49,0.26,1.69,0.72c0.29,0.68,0.07,1.49-0.62,1.86L1380.66,137.94z"/><path fill="currentColor" d="M1378.24,133.27c-0.68,0.43-1.63,0.05-1.92-0.59c-0.26-0.57-0.1-1.41,0.56-1.83l10.68-6.74c0.7-0.44,1.61-0.17,1.93,0.49c0.29,0.59,0.09,1.48-0.61,1.92L1378.24,133.27z"/></svg>`,
  vision: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1420.01 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M1696.14,125.95c0.61-0.92,1.68-1.82,3.08-1.82l38.34,0c1.94,0,3.7,1.13,4.39,2.94l6.99,18.24l0.82-8c0.76-14.3,7.28-27.57,18.26-36.74c2.26-1.89,4.51-3.56,7.18-5.04c-3.63-2.35-5.31-5.83-5.88-10.13c-7.73-4.36-12.96-13.18-8.03-21.3c-2.44-3.85-3.01-8.83-1.04-12.88c2.88-5.93,9.88-9.01,16.28-10.06c8.32-1.35,16.73-0.26,24.55,2.86c3.54,1.41,6.69,3.22,9.6,5.61c2.51,2.05,4.54,4.41,5.98,7.28c2.68,5.35,1.52,11.42-2.83,15.49c2.51,7.17-1.14,13.18-7.41,16.39c4.09,0.46,7.79,1.28,11.44,2.94c9.48,4.33,16.84,12.36,19.87,22.39c0.9,2.98,1.7,6,1.7,9.18l0.05,55.56c0,4.25-3.63,8.25-7.99,8.26l-113.23,0.03c-0.78,0-1.35-0.72-1.38-1.36c-0.29-5.12,1.8-10,5.82-13.27l-8.73-0.08c-2.59-0.02-4.3-2.61-4.25-5.08c0.01-0.63,0.17-1.54-0.05-2.11l-13.59-35.48C1695.53,128.31,1695.31,127.22,1696.14,125.95z M1804.2,61.69c3.31,2.04,5.99,4.62,8.26,7.86c1.88-2.22,3.03-4.93,2.62-7.8c-0.91-6.36-7.57-11.62-13.27-14.21c-8.51-3.87-18.82-5.25-27.86-2.8c-5.78,1.56-11.95,5.49-11.98,11.77c-0.01,1.86,0.61,3.58,1.37,5.28c4.57-4.22,10.52-5.79,16.73-6.11C1788.66,55.26,1796.99,57.26,1804.2,61.69z M1772.53,86.89c0.9,3.52,3.38,6.3,6.83,7.38l0.01-2.55c0-0.93,0.44-1.58,1.3-1.67c0.85-0.09,1.62,0.5,1.63,1.47l0.05,3.19c9.3-0.02,16.65-7.09,17.1-16.15c0.17-3.39,0.1-6.67,0.04-10.07c-0.05-2.97-1.38-5.6-3.59-7.56c-6.96-2.46-14.92-3.16-22.09-1.35c-1.18,1.35-1.53,3.03-1.53,4.84l-0.03,19.2c2.61,1.17,6.77,1.09,7.24-1.41c0.14-0.75,0.82-1.14,1.5-1.09c1.84,0.12,1.01,2.06,2.3,2.82c2.19,1.3,4.76,1.1,6.86-0.31c0.66-0.44,1.48-0.41,1.96,0.1c0.46,0.48,0.57,1.55-0.05,2.06c-3.24,2.65-8.02,2.53-11.31,0.01C1778.44,87.53,1775.55,87.61,1772.53,86.89z M1769.32,81.93l0.05-18.47l0.32-2.41c-5.52,2.46-9.08,7.51-6.64,13.48C1764.33,77.67,1766.65,80.02,1769.32,81.93z M1801.43,87.64c2.99-0.89,5.61-2.31,7.75-4.58c3.54-3.75,3.09-8.65,0.15-12.83c-2.11-2.79-4.74-5.02-7.87-6.78l0.95,4.18c1.39,0.3,2.51,1.16,3.19,2.55c1.74,3.59,1.56,7.94-0.25,11.52c-0.93,1.83-2.47,3.01-4.35,3.49l-1.4,2.99L1801.43,87.64z M1802.47,70.87l0,6.62l-0.17,3.47C1804.18,78.22,1804.63,73.58,1802.47,70.87z M1781.79,147.75c-0.06-0.81,0.64-1.5,1.46-1.5l4.7,0l0.05-7.78c0.05-8.17,2.36-16.06,6.19-23.25c5.13-9.05,12.57-16.43,21.79-21.11c-5.5-2.17-11.23-2.84-16.95-2.46l-10.23,10.26l-6.73,6.76c-4.29,4.62-7.21,10.12-9.03,16.17c-1.19,4.44-2.02,8.82-2.03,13.44l-0.03,10.39l10.73,1.34L1781.79,147.75z M1784.64,163.78l4.69-0.03c2.09,0.17,1.64,3.22,1.25,5.81l28.23-0.05c3.84-0.01,7.41-1.56,10.38-3.93c4.65-3.72,7.34-9.37,7.35-15.38l0.03-25.96c-0.61-12.22-6.76-22.45-17.31-28.46c-16.64,7.61-27.68,24.01-28.37,42.31l-0.03,8.14l19.94,0.01l0.05-22.18c0-0.88,0.54-1.49,1.34-1.56c0.68-0.06,1.55,0.54,1.55,1.44l-0.03,22.39c5.03,0.34,9.33,3.22,11.76,7.6c0.42,0.75,0.4,1.58-0.35,2.1c-0.59,0.41-1.64,0.39-2.08-0.44c-2.06-3.95-6.06-6.43-10.59-6.39l-27.79-0.01L1784.64,163.78z M1782.31,104.27l8.12-8.13c-2.72,1.04-5.11,1.57-8.16,1.54L1782.31,104.27z M1779.39,97.44l-1.23-0.28l-3.65,2.29l4.86,4.87L1779.39,97.44z M1762.44,152.75l2.31-1.77c1.02-0.78,2.05-1.42,3.26-1.94l0.07-11.52c0.06-9.92,4.09-22.24,10.73-29.69l-6.87-6.68l-3.5,2.94c-9.45,8.64-15.13,20.59-15.76,33.42l-0.92,9.13c3.4,0.57,5.95,2.68,7.77,5.6l0.02-28.16c0.14-0.81,0.72-1.24,1.46-1.24c0.51,0,1.42,0.47,1.42,1.36L1762.44,152.75z M1752.79,163.74l-13.41-35.24c-0.35-0.92-1.05-1.48-2.05-1.48l-38.05,0c-0.2,0-0.65,0.15-0.66,0.31l-0.06,0.79l13.68,35.62L1752.79,163.74z M1758.2,156.78l-0.85-2.05c-1.22-2.92-3.65-5.14-6.88-5.33l5.19,13.57c0.12,0.3,0.18,0.71,0.39,0.76c0.21,0.05,0.85-0.06,0.84-0.11C1755.53,161,1756.4,158.8,1758.2,156.78z M1763.19,163.67l3.49,0.08c1.59-1.36,3.11-2.62,4.95-3.59c1.06-0.55,2.33-0.14,3.32,0.43c2.24,1.3,5,1.23,6.8-0.77l0.02-6.8l-9.84-1.35c-1.89-0.26-3.39,0.08-4.9,1.24c-2.37,1.82-9.39,7.1-7.62,8.99c0.5,0.53,1.55-0.15,2.03-0.56c2.47-2.13,4.89-4.07,7.65-5.82c0.61-0.38,1.51,0.08,1.77,0.57c0.36,0.66,0.24,1.49-0.42,1.93C1767.89,159.73,1765.62,161.52,1763.19,163.67z M1817.27,184.21l14.21-0.05c2.65-0.01,5.04-2.61,5.04-5.27l0.03-17.4c-1.35,2.1-2.72,3.96-4.56,5.56c-3.78,3.42-8.44,5.3-13.57,5.45l-14.09,0.05C1809.53,175.29,1813.94,179.1,1817.27,184.21z M1774.68,163.71l-1.81-0.98l-1.29,1L1774.68,163.71z M1786.5,169.54c1.31,0,1.8-2.06,1.23-2.84l-74.88,0c-0.36,0.85-0.06,2.84,1.22,2.84L1786.5,169.54z M1744.71,184.23l68.96,0c-2.08-2.71-4.37-4.97-7.01-6.82c-4.8-3.49-10.24-4.93-16.15-4.93l-34.2,0.01c-2.88-0.03-5.31,0.97-7.48,2.9C1746.34,177.66,1744.95,180.72,1744.71,184.23z M1719.81,184.22l21.95,0.01c0.29-4.61,2.22-8.73,5.87-11.71l-16.15-0.01c-2.33-0.03-4.42,0.49-6.35,1.88C1721.93,176.69,1720.01,180.15,1719.81,184.22z"/></svg>`,
}

/* ─── Helpers to resolve image/video URLs from Sanity media items ──────── */
function mediaImageUrl(item, w = 2000) {
  return urlFor(item).width(w).auto('format').url()
}

function coverImageUrl(project, w = 1600) {
  if (!project.coverImage) return ''
  return urlFor(project.coverImage).width(w).auto('format').url()
}

/* ─── Fetch content from Sanity ─────────────────────────────────── */
const content = await fetchContent()
const {sections: sectionsDocs, projects: projectDocs} = content

// Landing SECTIONS (derived from Sanity) — palette stays cream-on-black globally
const SECTIONS = sectionsDocs.map((s, i) => {
  const cleanTitle = (s.title || '').replace(/\.$/, '')
  const cleanSubtitle = (s.subtitle || '').replace(/\.$/, '')
  const description = (s.description || s.subtitle || '').replace(/\.$/, '')
  return {
    id: s.slug,
    bg: '#0A0A0A',
    accent: '#F5F0E1',
    // hero copy: ALWAYS 2 lines. Line 1: "We are <name>." Line 2: "<description>."
    heroLine: `We are <em>${cleanTitle}.</em><br>${description}.`,
    heroSub: '',
    counterPrefix: `${String(s.order).padStart(2, '0')} / ${String(sectionsDocs.length).padStart(2, '0')} — `,
    counterSection: s.counterLabel || cleanTitle,
    cNum: `__${String(s.order).padStart(2, '0')}`,
    // bottom-nav label: short, no "MAD" prefix, no period
    cTitle: cleanTitle.replace(/^MAD\s*\+?\s*/i, '') || cleanTitle,
    cSub: s.cardLabel || s.subtitle || '',
  }
})

// Illustration HTML by slug
const ILLUS = Object.fromEntries(
  sectionsDocs.map((s) => [s.slug, s.illustrationSvg || ''])
)

// 3D avatar overrides — when a slug is here, we render the optimized WebP
// (1024 + 1600 retina via srcset, with PNG fallback wrapped in <picture>).
// Generated by scripts/optimize-avatars.mjs (95% smaller than source PNGs).
const AVATARS = {
  originals: 'originals',
  bubble: 'bubble',
  music: 'music',
  vision: 'vision',
}

function illusMarkup(slug) {
  if (AVATARS[slug]) {
    const id = AVATARS[slug]
    return `
      <div class="avatar-stage">
        <div class="avatar-shadow"></div>
        <div class="avatar-float">
          <img
            class="avatar3d"
            src="/avatars/${id}.webp"
            srcset="/avatars/${id}.webp 1x, /avatars/${id}@2x.webp 2x"
            alt="${slug} section avatar"
            draggable="false"
            decoding="async"
            fetchpriority="high">
          <div class="avatar-light"></div>
        </div>
        <div class="speech-bubble" id="speech-bubble" aria-hidden="true">
          <span class="speech-text"></span>
        </div>
      </div>
    `
  }
  return ILLUS[slug] || ''
}

/* ─── Speech bubble — rotating witty phrases per section ─── */
const SPEECH = {
  originals: [
    '9+ years of madness.',
    'Currently making something mad.',
    'Last project: BIOLAB.',
    'Coffee: too many.',
    'Ask me anything.',
    'Stop scrolls.',
  ],
  bubble: [
    'Off the brief.',
    'Personal art only.',
    'No rules here.',
    'Side obsession #47.',
  ],
  music: [
    'Beats since forever.',
    'Egyptian instruments + deep house.',
    'No formula.',
    'Currently producing.',
  ],
  vision: [
    'Rolling.',
    'AI tools, no limits.',
    'Films, shorts, music videos.',
    'Concept first.',
  ],
}

const SPEECH_POSITIONS = [
  // sides only, AVOID eye-level zone (rough top 18%-50% area)
  // upper sides (above the eyes, by the temples)
  'side-left-upper', 'side-right-upper',
  // lower sides (cheek/jaw, below the eyes)
  'side-left-lower', 'side-right-lower',
  // very-lower (chin level)
  'side-left-bottom', 'side-right-bottom',
]
let speechTimer = null
let speechIdx = 0
let lastPosIdx = -1
function startSpeechRotation(slug) {
  const bubble = document.getElementById('speech-bubble')
  if (!bubble) return
  const phrases = SPEECH[slug] || []
  if (!phrases.length) {
    bubble.style.display = 'none'
    return
  }
  bubble.style.display = ''
  const textEl = bubble.querySelector('.speech-text')
  speechIdx = 0
  if (speechTimer) clearInterval(speechTimer)
  function show() {
    bubble.classList.remove('show')
    setTimeout(() => {
      textEl.textContent = phrases[speechIdx % phrases.length]
      // pick a random position, never the same as last time
      let p
      do {
        p = Math.floor(Math.random() * SPEECH_POSITIONS.length)
      } while (p === lastPosIdx && SPEECH_POSITIONS.length > 1)
      lastPosIdx = p
      bubble.dataset.pos = SPEECH_POSITIONS[p]
      bubble.classList.add('show')
      speechIdx++
    }, 350)
  }
  show()
  speechTimer = setInterval(show, 4500)
}

// Detail PAGES keyed by slug, with works filtered per section
const PAGES = Object.fromEntries(
  sectionsDocs.map((s) => {
    const works = projectDocs
      .filter((p) => p.sectionSlug === s.slug)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        year: p.year || '',
        caption: p.caption || '',
        tags: p.tags || [],
        coverUrl: coverImageUrl(p),
        media: p.media || [],
        caseStudy: p.caseStudy || null,
      }))
    return [
      s.slug,
      {
        kicker: s.kicker || '',
        manifesto: (s.manifesto || '').replace(/\n/g, '<br>'),
        lead: (s.lead || '').replace(/\n/g, '<br>'),
        agencies: s.agencies || [],
        worksLabel: s.worksLabel || 'Selected Works',
        worksTitle: s.worksTitle || '',
        works,
        musicEmbed: s.musicEmbed || null,
        musicPlatforms: s.musicPlatforms || [],
        instagramMusic: s.instagramMusic || null,
      },
    ]
  })
)

/* Global ordered list of all projects across all sections.
   Used to power cross-section "Next Project" navigation: at the end of
   one section we jump to the first project of the next section. Sections
   without projects are skipped. Loops back to the very first project at
   the very end. */
const ALL_PROJECTS = sectionsDocs
  .flatMap((s) => (PAGES[s.slug] && PAGES[s.slug].works.length ? PAGES[s.slug].works.map((w) => ({sectionId: s.slug, work: w})) : []))

function findNextProject(sectionId, projectSlug) {
  if (!ALL_PROJECTS.length) return null
  const i = ALL_PROJECTS.findIndex((e) => e.sectionId === sectionId && e.work.slug === projectSlug)
  if (i < 0) return null
  return ALL_PROJECTS[(i + 1) % ALL_PROJECTS.length]
}

const SITE = content.siteSettings || {}

/* ─── Landing page state & rendering ─────────────────────────────── */
let current = 0

function buildNav() {
  const nav = document.getElementById('nav-cards')
  nav.innerHTML = ''
  // dots for mobile carousel
  const dotsEl = document.getElementById('carousel-dots')
  if (dotsEl) {
    dotsEl.innerHTML = SECTIONS.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" data-idx="${i}"></span>`).join('')
    dotsEl.querySelectorAll('.dot').forEach((d) => {
      d.addEventListener('click', () => {
        const idx = parseInt(d.dataset.idx, 10)
        switchTo(idx)
        const card = nav.querySelectorAll('.nav-card')[idx]
        if (card && window.matchMedia('(max-width: 768px)').matches) {
          card.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'})
        }
      })
    })
  }
  SECTIONS.forEach((s, i) => {
    const d = document.createElement('div')
    d.className = 'nav-card' + (i === 0 ? ' active' : '')
    d.dataset.id = s.id
    d.dataset.num = String(i + 1).padStart(2, '0')
    d.innerHTML = `
      <div class="c-info">
        <span class="c-num">${s.cNum}</span>
        <span class="c-title">${s.cTitle}</span>
        <span class="c-sub">${s.cSub}</span>
      </div>
      <div class="c-icon">${ICONS[s.id] || ''}</div>
      <div class="c-enter">Enter</div>
    `
    d.addEventListener('click', () => {
      // If user is currently on a detail/project overlay, navigate to that section's detail.
      // Otherwise (on landing) just switch the active section — landing stays at "/".
      const onOverlay =
        detailPage.classList.contains('open') || projectView.classList.contains('open')
      if (onOverlay) navigate({view: 'detail', id: s.id})
      else switchTo(i)
    })
    nav.appendChild(d)
  })
  setupCarouselScrollSync(nav)
}

/* On mobile the nav-cards container is a horizontal snap carousel.
   Detect which card is centered after a swipe and call switchTo. */
function setupCarouselScrollSync(nav) {
  let scrollTimer = null
  nav.addEventListener('scroll', () => {
    if (window.matchMedia('(min-width: 769px)').matches) return
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      const cards = Array.from(nav.querySelectorAll('.nav-card'))
      const center = nav.scrollLeft + nav.clientWidth / 2
      let bestIdx = 0
      let bestDist = Infinity
      cards.forEach((c, i) => {
        const mid = c.offsetLeft + c.clientWidth / 2
        const d = Math.abs(mid - center)
        if (d < bestDist) {
          bestDist = d
          bestIdx = i
        }
      })
      if (bestIdx !== current) switchTo(bestIdx)
    }, 120)
  }, {passive: true})
}

function renderCounter(s) {
  return `${s.counterPrefix}<span class="counter-section">${s.counterSection}</span>`
}

function applyCardStyles(activeIdx) {
  // poch-style monochrome: no per-section color flips, only active state via CSS class
  document.querySelectorAll('.nav-card').forEach((c, j) => {
    // ensure no leftover inline styles from earlier states
    c.style.background = ''
    c.style.color = ''
    c.style.borderColor = ''
    c.classList.toggle('active', j === activeIdx)
  })
}

function hackerType(el, text, speed) {
  if (el._twIv) clearInterval(el._twIv)
  const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*?/<>'
  const rnd = () => pool[Math.floor(Math.random() * pool.length)]
  let i = 0
  el._twIv = setInterval(() => {
    let out = text.slice(0, i)
    for (let j = i; j < text.length; j++) {
      const c = text[j]
      out += c === ' ' || c === '\n' ? c : rnd()
    }
    el.textContent = out
    i++
    if (i > text.length) {
      clearInterval(el._twIv)
      el._twIv = null
      el.textContent = text
    }
  }, speed)
}

function typeActiveCard(idx) {
  const s = SECTIONS[idx]
  const card = document.querySelectorAll('.nav-card')[idx]
  if (!card) return
  const title = card.querySelector('.c-title')
  const sub = card.querySelector('.c-sub')
  hackerType(title, s.cTitle, 45)
  hackerType(sub, s.cSub, 25)
}

function switchTo(i) {
  if (i === current) return
  current = i
  const s = SECTIONS[i]

  const hl = document.getElementById('headline')
  const sub = document.getElementById('subtitle')
  const illus = document.getElementById('illustration')
  const counter = document.getElementById('counter')

  hl.classList.add('fading')
  sub.classList.add('fading')
  illus.classList.add('fading')

  setTimeout(() => {
    hl.innerHTML = s.heroLine
    sub.innerHTML = s.heroSub
    illus.innerHTML = illusMarkup(s.id)
    illus.dataset.id = s.id
    counter.innerHTML = renderCounter(s)
    hl.classList.remove('fading')
    sub.classList.remove('fading')
    illus.classList.remove('fading')
    startSpeechRotation(s.id)
    syncEnterPill(s)
  }, 180)

  applyCardStyles(i)
}

/* ─── ENTER PILL — section-aware doorway ─────────── */
function syncEnterPill(s) {
  const pill = document.getElementById('enter-pill')
  if (!pill) return
  const label = document.getElementById('enter-pill-label')
  if (label) label.textContent = `Enter ${s.cTitle}`
  pill.dataset.id = s.id
  pill.setAttribute('aria-label', `Enter ${s.cTitle} section`)
}

/* Init landing */
buildNav()
const s0 = SECTIONS[0]
if (s0) {
  document.getElementById('headline').innerHTML = s0.heroLine
  document.getElementById('subtitle').innerHTML = s0.heroSub
  document.getElementById('counter').innerHTML = renderCounter(s0)
  document.getElementById('illustration').innerHTML = illusMarkup(s0.id)
  document.getElementById('illustration').dataset.id = s0.id
  applyCardStyles(0)
  startSpeechRotation(s0.id)
  syncEnterPill(s0)
}

/* Enter-pill click → navigate to current section's detail */
{
  const pill = document.getElementById('enter-pill')
  if (pill) {
    pill.addEventListener('click', () => {
      const id = pill.dataset.id || (SECTIONS[current] && SECTIONS[current].id)
      if (id) navigate({view: 'detail', id})
    })
  }
}

/* ─── DETAIL PAGE ────────────────────────────────── */
const detailPage = document.getElementById('detail-page')
const detailInner = document.getElementById('detail-inner')
const detailBack = document.getElementById('detail-back')
const detailProgressUpdate = bindScrollProgress(
  detailPage,
  document.getElementById('detail-scroll-progress-fill'),
)

/* ─── MUSIC SECTION HELPERS ───────────────────────────────────
   Convert a user-pasted Spotify/YouTube/SoundCloud URL into an
   embeddable iframe. Supports the URLs editors commonly paste from
   the Sanity Studio. */
function buildMusicEmbed(embed) {
  if (!embed || !embed.embedUrl) return ''
  const url = embed.embedUrl.trim()
  let iframeSrc = ''
  let iframeAttrs = 'frameborder="0" allow="autoplay; encrypted-media; clipboard-write" loading="lazy"'
  let height = '352'

  if (embed.type === 'spotify' || /spotify\.com/.test(url)) {
    // Convert https://open.spotify.com/<type>/<id> to /embed/<type>/<id>
    const m = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/)
    if (m) {
      iframeSrc = `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`
      height = m[1] === 'track' ? '152' : '352'
    }
  } else if (embed.type === 'youtube' || /youtu\.?be/.test(url)) {
    // Pull the video ID or playlist ID
    const vid = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
    const list = url.match(/[?&]list=([A-Za-z0-9_-]+)/)
    if (list) iframeSrc = `https://www.youtube.com/embed/videoseries?list=${list[1]}`
    else if (vid) iframeSrc = `https://www.youtube.com/embed/${vid[1]}`
    iframeAttrs += ' allowfullscreen'
    height = '420'
  } else if (embed.type === 'soundcloud' || /soundcloud\.com/.test(url)) {
    iframeSrc =
      'https://w.soundcloud.com/player/?url=' +
      encodeURIComponent(url) +
      '&color=%23F5F0E1&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false'
    height = '166'
  } else if (embed.type === 'apple-music' || /music\.apple\.com/.test(url)) {
    // music.apple.com → embed.music.apple.com
    iframeSrc = url.replace(/music\.apple\.com/, 'embed.music.apple.com')
    height = '450'
  }

  if (!iframeSrc) return ''
  return `
    <div class="music-embed-wrap">
      ${embed.caption ? `<div class="music-embed-label">${embed.caption}</div>` : ''}
      <iframe
        class="music-embed"
        src="${iframeSrc}"
        width="100%"
        height="${height}"
        ${iframeAttrs}>
      </iframe>
    </div>
  `
}

/* Platform metadata: brand color + official SVG icon path (sourced from
   Simple Icons https://simpleicons.org/, all 24×24 viewBox). The icons
   render in the platform's brand color so each pill is instantly
   recognizable without the user having to read the label. */
const PLATFORM_META = {
  spotify: {
    label: 'Spotify',
    color: '#1DB954',
    icon: 'M11.999 0C5.371 0 0 5.371 0 12s5.371 12 11.999 12C18.627 24 24 18.629 24 12s-5.373-12-12.001-12zm5.506 17.299a.747.747 0 0 1-1.029.249c-2.819-1.722-6.366-2.111-10.546-1.157a.748.748 0 1 1-.333-1.458c4.572-1.044 8.494-.594 11.658 1.337a.747.747 0 0 1 .25 1.029zm1.469-3.267a.937.937 0 0 1-1.286.308c-3.227-1.984-8.146-2.558-11.962-1.4a.937.937 0 1 1-.543-1.794c4.358-1.323 9.778-.682 13.483 1.6a.937.937 0 0 1 .308 1.286zm.126-3.403C15.244 8.474 8.524 8.272 4.78 9.408a1.124 1.124 0 1 1-.652-2.151c4.297-1.305 11.72-1.054 16.351 1.7a1.123 1.123 0 1 1-1.379 1.672z',
  },
  'apple-music': {
    label: 'Apple Music',
    color: '#FA233B',
    icon: 'M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.7.165c-.46-.106-.93-.146-1.4-.165H5.71a14.794 14.794 0 0 0-1.45.16C2.27.572.967 1.605.36 3.494c-.205.629-.286 1.27-.324 1.917-.04.694-.04 1.388-.04 2.082v8.974c0 .694 0 1.388.04 2.082.04.647.119 1.288.324 1.917.607 1.889 1.91 2.922 3.9 3.319.485.097.974.13 1.464.139.69.013 1.38.013 2.07.013h8.86c.69 0 1.38 0 2.07-.013.49-.01.98-.042 1.464-.14 1.99-.396 3.293-1.43 3.9-3.318.205-.629.285-1.27.324-1.917.04-.694.04-1.388.04-2.082V8.207c0-.694 0-1.388-.04-2.082zM17.498 14.4c-.022.85-.302 1.526-.84 2.016-.539.49-1.276.74-2.214.74-.94 0-1.677-.25-2.215-.74-.539-.49-.819-1.166-.84-2.016V8.27c.022-.85.301-1.527.84-2.017.538-.49 1.275-.74 2.215-.74s1.675.25 2.214.74c.538.49.818 1.167.84 2.017v6.13zM10.36 6.913c-.013-.56-.213-1.026-.6-1.4-.387-.373-.92-.56-1.6-.56s-1.213.187-1.6.56c-.387.374-.587.84-.6 1.4v8.5c.013.56.213 1.026.6 1.4.387.373.92.56 1.6.56s1.213-.187 1.6-.56c.387-.374.587-.84.6-1.4v-8.5z',
  },
  'youtube-music': {
    label: 'YouTube Music',
    color: '#FF0033',
    icon: 'M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228 18.228 15.432 18.228 12 15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z',
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0033',
    icon: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  soundcloud: {
    label: 'SoundCloud',
    color: '#FF5500',
    icon: 'M23.999 14.165c-.052 1.796-1.612 3.169-3.4 3.169h-8.18a.68.68 0 0 1-.675-.683V6.638c-.005-.317.211-.598.519-.683 0 0 1.243-.585 2.811-.585a5.43 5.43 0 0 1 5.4 4.9c.327-.116.671-.176 1.018-.176 1.681 0 3.043 1.346 3.043 3.014 0 .354-.06.689-.176 1.001zM10.36 17.334H9.978V8.972a.397.397 0 0 1 .396-.397.397.397 0 0 1 .397.397v8.362a.397.397 0 0 1-.397.397.397.397 0 0 1-.014 0zm-1.92 0H8.06V9.516a.39.39 0 0 1 .39-.39.39.39 0 0 1 .39.39v7.818a.39.39 0 0 1-.4 0zm-1.92 0h-.38V10.072a.388.388 0 0 1 .388-.388.388.388 0 0 1 .388.388v7.262a.388.388 0 0 1-.396 0zm-1.92 0h-.38V10.628a.39.39 0 0 1 .388-.39.39.39 0 0 1 .388.39v6.706a.39.39 0 0 1-.396 0zm-1.92 0h-.38v-5.71a.39.39 0 0 1 .388-.39.39.39 0 0 1 .39.39v5.71a.39.39 0 0 1-.398 0z',
  },
  tidal: {
    label: 'Tidal',
    color: '#000000',
    icon: 'M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.016 7.996l3.992-3.996L24 7.996l-3.992 4.004z',
  },
  anghami: {
    label: 'Anghami',
    color: '#7B16FF',
    icon: 'M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.5 14.25h-1.5v-9h1.5v9zm3 0h-1.5v-7.5h1.5v7.5zm3 0h-1.5v-6h1.5v6zm-7.5-2.25h-1.5v-3h1.5v3z',
  },
  bandcamp: {
    label: 'Bandcamp',
    color: '#629AA9',
    icon: 'M0 18.75l7.437-13.5H24l-7.438 13.5H0z',
  },
  deezer: {
    label: 'Deezer',
    color: '#A238FF',
    icon: 'M18.812 4.972h5.183V7.36h-5.183V4.972zm0 3.578h5.183v2.387h-5.183V8.55zm0 3.578h5.183v2.387h-5.183v-2.387zm0 3.578h5.183v2.387h-5.183v-2.387zm0 3.578h5.183v2.387h-5.183v-2.387zM12.531 8.55h5.183v2.387h-5.183V8.55zm0 3.578h5.183v2.387h-5.183v-2.387zm0 3.578h5.183v2.387h-5.183v-2.387zm0 3.578h5.183v2.387h-5.183v-2.387zM6.249 12.128h5.183v2.387H6.249v-2.387zm0 3.578h5.183v2.387H6.249v-2.387zm0 3.578h5.183v2.387H6.249v-2.387zM0 15.706h5.183v2.387H0v-2.387zm0 3.578h5.183v2.387H0v-2.387z',
  },
  'amazon-music': {
    label: 'Amazon Music',
    color: '#1AD1FF',
    icon: 'M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 0 1-4.83.615c-2.53 0-4.92-.464-7.17-1.39a17.7 17.7 0 0 1-4.964-3.184l-.045-.045c-.135-.135-.135-.27 0-.405l-.045.045zm6.405-9.485c0-1.13.27-2.085.81-2.865.54-.78 1.276-1.366 2.205-1.756.84-.36 1.785-.624 2.835-.795.36-.06.945-.135 1.755-.225v-.345c0-.84-.09-1.4-.27-1.68-.27-.39-.69-.585-1.245-.585h-.135c-.42.03-.78.165-1.08.405-.3.24-.495.585-.585 1.035-.06.27-.21.42-.45.45L7.59 1.965c-.27-.06-.405-.21-.405-.45-.06-.6.105-1.155.495-1.65.39-.495.84-.87 1.35-1.125.51-.255 1.05-.42 1.62-.495a8.85 8.85 0 0 1 1.35-.105c1.5 0 2.7.39 3.6 1.155.21.18.39.39.54.63.15.24.27.495.36.765.09.27.15.51.18.72.03.21.045.45.045.72v6.51c0 .42.06.81.18 1.17.12.36.27.63.45.81 0 .03.045.075.135.135.21.18.315.345.315.495 0 .15-.075.285-.225.405-.78.66-1.245 1.05-1.395 1.17-.27.21-.585.21-.945.03-.18-.15-.345-.3-.495-.45-.15-.15-.255-.255-.315-.315-.06-.06-.165-.21-.315-.45-.15-.24-.255-.405-.315-.495-.96.99-1.95 1.62-2.97 1.89-.54.15-1.155.225-1.845.225-1.05 0-1.92-.33-2.61-.99-.69-.66-1.035-1.575-1.035-2.745z',
  },
}

/* Generic music note for unknown platforms */
const FALLBACK_ICON = 'M12 3v9.28c-.47-.17-.97-.28-1.5-.28A4.5 4.5 0 0 0 6 16.5 4.5 4.5 0 0 0 10.5 21a4.5 4.5 0 0 0 4.5-4.5V6h4V3h-7z'

function buildPlatformLinks(platforms, instagramMusic) {
  const items = []
  for (const p of platforms || []) {
    if (!p || !p.url) continue
    const meta = PLATFORM_META[p.platform] || {label: p.platform || 'Listen', color: '#F5F0E1', icon: FALLBACK_ICON}
    const label = p.label || meta.label
    items.push(
      `<a class="music-pill" href="${p.url}" target="_blank" rel="noopener" style="--platform:${meta.color}" aria-label="${label} ↗">
         <svg class="music-pill-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="${meta.icon}"/>
         </svg>
         <span class="music-pill-label">${label}</span>
         <span class="music-pill-arrow" aria-hidden="true">↗</span>
       </a>`,
    )
  }
  if (instagramMusic && (instagramMusic.handle || instagramMusic.url)) {
    const handle = instagramMusic.handle ? instagramMusic.handle.replace(/^@/, '') : ''
    const url = instagramMusic.url || (handle ? `https://www.instagram.com/${handle}/` : '')
    if (url) {
      // Instagram official Simple Icons SVG path
      const igIcon = 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z'
      items.push(
        `<a class="music-pill music-pill-ig" href="${url}" target="_blank" rel="noopener" aria-label="Instagram @${handle} ↗">
           <svg class="music-pill-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
             <path d="${igIcon}"/>
           </svg>
           <span class="music-pill-label">Instagram${handle ? ` · @${handle}` : ''}</span>
           <span class="music-pill-arrow" aria-hidden="true">↗</span>
         </a>`,
      )
    }
  }
  if (!items.length) return ''
  return `
    <div class="music-platforms">
      <div class="music-platforms-label">— Listen / Follow</div>
      <div class="music-platforms-grid">${items.join('')}</div>
    </div>
  `
}

function buildDetail(id) {
  const p = PAGES[id]
  if (!p) return
  const works = p.works.length
    ? p.works
    : [{title: 'Coming Soon', year: '—', caption: 'Project in progress', tags: ['WIP']}]
  const agenciesHTML = p.agencies.length
    ? `
    <div class="detail-section-label">— In Collaboration With</div>
    <div class="agencies">
      <div class="agencies-track">
        ${[...p.agencies, ...p.agencies].map((a) => `<span>${a}</span>`).join('')}
      </div>
    </div>
  `
    : ''
  const contactEmail = SITE.contactEmail || 'madboulyjr.7@gmail.com'
  // Resolve section's display name (e.g. "Originals", "Bubble", "MAD+", "Vision")
  const sec = SECTIONS.find((s) => s.id === id)
  const secLabel = sec ? sec.cTitle : id
  detailInner.innerHTML = `
    <div class="detail-hero">
      <div class="detail-copy">
        <!-- Section banner: Back pill + MAD logo + section name, all on one row -->
        <div class="detail-section-banner" aria-label="MAD ${secLabel}">
          <button class="detail-back detail-back-inline" type="button" aria-label="Back to home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Back</span>
          </button>
          <svg class="detail-banner-logo" viewBox="30 320 530 165" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M39.25,329.84h64.47l35.87,41.64l17.07-41.64h80.11v139.39h-65.84l-5.49-72.29l-16.46,72.29h-35.67l-44.17-72.68l22.22,72.68H39.25V329.84z"/>
            <path fill-rule="evenodd" d="M286.44,329.84h86.42l30.18,139.39h-55.29l-10.97-36.64h-26.06l-2.19,36.64h-65.42L286.44,329.84z M330,408.3l-14.54-48.39l-3.02,48.39H330z"/>
            <path fill-rule="evenodd" d="M503.63,329.84h-93.44v139.39h93.44c28.64,0,51.86-23.22,51.86-51.86V381.7C555.49,353.06,532.27,329.84,503.63,329.84z M448.05,389.64v-29.73l76.11,4.75L448.05,389.64z"/>
          </svg>
          <span class="detail-banner-name">${secLabel}</span>
        </div>
        ${p.kicker ? `<div class="detail-kicker">${p.kicker}</div>` : ''}
        <h1 class="manifesto">${p.manifesto}</h1>
        <p class="detail-lead">${p.lead}</p>
      </div>
    </div>
    ${buildMusicEmbed(p.musicEmbed)}
    ${buildPlatformLinks(p.musicPlatforms, p.instagramMusic)}
    ${agenciesHTML}
    <div class="detail-section-label">${p.worksLabel} · ${String(works.length).padStart(2, '0')}</div>
    <h2 class="section-title">${p.worksTitle}</h2>
    <div class="works-list">
      ${works
        .map((w, i) => {
          // Caption is treated as ONE paragraph now. If it contains the
          // legacy "Brief — About — Approach" format we just join the
          // last two parts as a single readable paragraph.
          const cap = (w.caption || '').replace(/\s+—\s+/g, ' ').trim()
          const num = String(i + 1).padStart(2, '0')
          return `
        <article class="work-row" data-idx="${i}">
          <div class="work-cover">
            ${w.coverUrl ? `<img src="${w.coverUrl}" alt="${w.title}" loading="lazy" decoding="async">` : ''}
            <div class="work-cover-overlay" aria-hidden="true">
              <span class="work-open-pill">Open Case ↗</span>
            </div>
          </div>
          <div class="work-info">
            <div class="work-info-top">
              <span class="work-num" aria-hidden="true">— ${num}</span>
              <span class="work-year">${w.year || ''}</span>
            </div>
            <h3 class="work-title">${w.title}.</h3>
            ${cap ? `<p class="work-caption">${cap}</p>` : ''}
            <div class="work-info-bottom">
              <div class="work-tags">${(w.tags || []).map((t) => `<span>${t}</span>`).join('')}</div>
              <span class="work-cta" aria-hidden="true">View project ↗</span>
            </div>
          </div>
        </article>
      `
        })
        .join('')}
    </div>
    <div class="collab-cta">
      <div class="collab-kicker">Let's Collaborate</div>
      <h2 class="collab-title">Your brand,<br><em>legendary.</em></h2>
      <p class="collab-lead">Ready to elevate your story to legendary status? Let's build something that leaves the competition green with envy.</p>
      <a class="collab-btn" href="mailto:${contactEmail}">Get In Touch → </a>
    </div>
  `
}

function setEnterPillVisible(show) {
  const pill = document.getElementById('enter-pill')
  if (!pill) return
  if (show) pill.removeAttribute('hidden')
  else pill.setAttribute('hidden', '')
}

/* ─── SCROLL PROGRESS BARS ────────────────────────────────────────
   Each overlay (detail, project) has a 0.18rem bar at its top edge
   that fills as the user scrolls. Bound here to the scroll events
   of the overlay element itself (not window — they're inner-scroll). */
function bindScrollProgress(scrollEl, fillEl) {
  if (!scrollEl || !fillEl) return
  let raf = 0
  const update = () => {
    raf = 0
    const max = scrollEl.scrollHeight - scrollEl.clientHeight
    const pct = max > 0 ? Math.min(100, (scrollEl.scrollTop / max) * 100) : 0
    fillEl.style.width = pct.toFixed(2) + '%'
  }
  scrollEl.addEventListener(
    'scroll',
    () => {
      if (!raf) raf = requestAnimationFrame(update)
    },
    {passive: true},
  )
  // also recalc on opening (fresh content height)
  return update
}

/* IntersectionObserver — fade in work rows + agency block as they enter
   the detail page's scroll viewport. Uses the detail-page itself as root
   (it's the scroll container, not window). Re-armed every openDetailDOM
   so freshly built rows get observed. */
let workRowObserver = null
function armWorkRowObserver() {
  if (workRowObserver) workRowObserver.disconnect()
  // Skip on reduced-motion users — rows render visible immediately via CSS
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!('IntersectionObserver' in window)) return
  workRowObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view')
          workRowObserver.unobserve(entry.target)
        }
      }
    },
    {root: detailPage, rootMargin: '0px 0px -8% 0px', threshold: 0.05},
  )
  detailInner.querySelectorAll('.work-row').forEach((el) => workRowObserver.observe(el))
}

function openDetailDOM(id) {
  // If the detail page is already open for the SAME section, do nothing —
  // this preserves the user's scroll position when they back-out from a
  // project view (closeProjectDOM only removes the overlay; the detail
  // underneath should look exactly as the user left it).
  const alreadyOpenSameSection =
    detailPage.classList.contains('open') && detailPage.dataset.sectionId === id
  if (alreadyOpenSameSection) {
    setEnterPillVisible(false)
    return
  }
  // sync landing's selected section to match (so closing detail returns to the right one)
  const idx = SECTIONS.findIndex((s) => s.id === id)
  if (idx >= 0 && idx !== current) switchTo(idx)
  buildDetail(id)
  // sync the topbar sub-label ("Originals" / "Bubble" / "MAD+" / "Vision")
  const sec = SECTIONS.find((s) => s.id === id)
  if (sec) {
    const subEl = detailPage.querySelector('.detail-logo .sub')
    if (subEl) subEl.textContent = sec.cTitle
    const subEl2 = projectView.querySelector('.detail-logo .sub')
    if (subEl2) subEl2.textContent = sec.cTitle
  }
  detailPage.classList.add('open')
  detailPage.setAttribute('aria-hidden', 'false')
  detailPage.dataset.sectionId = id
  document.body.style.overflow = 'hidden'
  setEnterPillVisible(false)
  // reset progress bar to 0 on fresh open
  if (detailProgressUpdate) {
    detailPage.scrollTop = 0
    detailProgressUpdate()
  }
  // arm scroll-fade-in observer for the freshly built work rows
  armWorkRowObserver()
  // reveal first 3 rows immediately (above-the-fold) so the page
  // doesn't feel empty before user scrolls
  requestAnimationFrame(() => {
    detailInner.querySelectorAll('.work-row').forEach((el, i) => {
      if (i < 3) el.classList.add('is-in-view')
    })
  })
}
function closeDetailDOM() {
  detailPage.classList.remove('open')
  detailPage.setAttribute('aria-hidden', 'true')
  delete detailPage.dataset.sectionId
  document.body.style.overflow = ''
  setEnterPillVisible(true)
}
detailBack.addEventListener('click', () => navigate({view: 'landing'}))
// Inline Back button (built inside .detail-section-banner per buildDetail) —
// delegated click goes to landing.
detailInner.addEventListener('click', (e) => {
  if (e.target.closest('.detail-back-inline')) {
    e.preventDefault()
    navigate({view: 'landing'})
  }
})

/* ─── PROJECT VIEW (inside a work) ───────────────── */
const projectView = document.getElementById('project-view')
const projectViewInner = document.getElementById('project-view-inner')
const projectBack = document.getElementById('project-back')
const projectProgressUpdate = bindScrollProgress(
  projectView,
  document.getElementById('project-scroll-progress-fill'),
)

/* ─── LIGHTBOX — full-screen image viewer for project gallery ───
   Shows when a user taps any non-video gallery image. Supports prev/next
   within the current project's images, ESC/click-img to close, ←→ arrows. */
const lightboxEl = document.getElementById('lightbox')
const lightboxImg = document.getElementById('lightbox-img')
const lightboxCounter = document.getElementById('lightbox-counter')
let lightboxImages = []
let lightboxIdx = 0

function openLightbox(images, idx) {
  if (!lightboxEl || !images || !images.length) return
  lightboxImages = images
  lightboxIdx = Math.max(0, Math.min(idx, images.length - 1))
  renderLightbox()
  lightboxEl.classList.add('open')
  lightboxEl.classList.toggle('solo', images.length <= 1)
  lightboxEl.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  if (!lightboxEl) return
  lightboxEl.classList.remove('open')
  lightboxEl.setAttribute('aria-hidden', 'true')
  // restore overflow only if no other overlay needs it
  if (!detailPage.classList.contains('open') && !projectView.classList.contains('open')) {
    document.body.style.overflow = ''
  }
}

function renderLightbox() {
  if (!lightboxImg || !lightboxImages.length) return
  const src = lightboxImages[lightboxIdx]
  lightboxImg.src = src
  lightboxImg.alt = `Project image ${lightboxIdx + 1} of ${lightboxImages.length}`
  if (lightboxCounter) {
    lightboxCounter.textContent = `${lightboxIdx + 1} / ${lightboxImages.length}`
  }
}

function lightboxPrev() {
  if (lightboxImages.length < 2) return
  lightboxIdx = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length
  renderLightbox()
}
function lightboxNext() {
  if (lightboxImages.length < 2) return
  lightboxIdx = (lightboxIdx + 1) % lightboxImages.length
  renderLightbox()
}

if (lightboxEl) {
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox)
  document.getElementById('lightbox-prev').addEventListener('click', lightboxPrev)
  document.getElementById('lightbox-next').addEventListener('click', lightboxNext)
  // click image OR backdrop = close
  lightboxEl.addEventListener('click', (e) => {
    if (e.target === lightboxEl || e.target === lightboxImg) closeLightbox()
  })
}

// Delegate clicks on project gallery images to open the lightbox.
projectViewInner.addEventListener('click', (e) => {
  const item = e.target.closest('.project-gallery .g-item:not(.g-video) img')
  if (!item) return
  // collect ALL images in the gallery (high-res variants for lightbox)
  const all = Array.from(projectViewInner.querySelectorAll('.project-gallery .g-item:not(.g-video) img'))
  const srcs = all.map((img) => img.dataset.full || img.src)
  const idx = all.indexOf(item)
  openLightbox(srcs, idx)
})

function renderGalleryItem(item, gi) {
  if (item._type === 'videoItem' && item.playbackId) {
    const autoplay = item.autoplay !== false
    return `<div class="g-item g-video" style="--gi:${gi}">
      <mux-player
        playback-id="${item.playbackId}"
        stream-type="on-demand"
        ${autoplay ? 'autoplay muted loop playsinline' : 'controls'}
        style="width:100%;aspect-ratio:16/9;display:block;--controls:${autoplay ? 'none' : ''}"
      ></mux-player>
    </div>`
  }
  if (item._type === 'image' || item.asset) {
    return `<div class="g-item" style="--gi:${gi}">
      <img src="${mediaImageUrl(item)}" alt="${item.alt || ''}" loading="lazy">
    </div>`
  }
  return ''
}

function buildProject(works, idx, sectionId) {
  const w = works[idx]
  if (!w) return
  // Cross-section next: at the end of Originals we jump to the first
  // project in Bubble (or whichever section ships next). Loops globally.
  const nextEntry = findNextProject(sectionId, w.slug)
  const next = nextEntry ? nextEntry.work : works[(idx + 1) % works.length]
  const nextSectionId = nextEntry ? nextEntry.sectionId : sectionId
  const nextSection = SECTIONS.find((s) => s.id === nextSectionId)
  const isCrossSection = nextSectionId !== sectionId
  const nextLabel = isCrossSection
    ? `Next · From ${nextSection ? nextSection.cTitle : nextSectionId}`
    : 'Next Project'
  const media = w.media || []

  // ─── Case study fields (all optional; only render blocks that have data) ───
  const cs = w.caseStudy || {}
  const credits = [cs.role, cs.agency].filter(Boolean).join(' · ')
  const outcomeHTML = (cs.outcome && cs.outcome.length)
    ? `<div class="p-outcome">
         ${cs.outcome.map((o) => `
           <div class="p-stat">
             <div class="p-stat-num">${o.metric || ''}</div>
             <div class="p-stat-label">${o.label || ''}</div>
           </div>
         `).join('')}
       </div>`
    : ''
  const problemHTML = cs.problem
    ? `<div class="p-block p-problem">
         <div class="p-block-label">— The Problem</div>
         <p class="p-block-body">${cs.problem}</p>
       </div>`
    : ''
  const constraintsHTML = (cs.constraints && cs.constraints.length)
    ? `<div class="p-block p-constraints">
         <div class="p-block-label">— Constraints</div>
         <div class="p-constraint-tags">
           ${cs.constraints.map((c) => `<span>${c}</span>`).join('')}
         </div>
       </div>`
    : ''
  const awardsHTML = (cs.awards && cs.awards.length)
    ? `<div class="p-block p-awards">
         <div class="p-block-label">— Recognition</div>
         <div class="p-award-list">
           ${cs.awards.map((a) => `<span>★ ${a}</span>`).join('')}
         </div>
       </div>`
    : ''
  const externalHTML = cs.externalUrl
    ? `<a class="p-external" href="${cs.externalUrl}" target="_blank" rel="noopener">View full case study ↗</a>`
    : ''

  projectViewInner.innerHTML = `
    <div class="project-hero" data-num="${String(idx + 1).padStart(2, '0')}">
      <div class="p-top">
        <span class="p-index">— Case ${String(idx + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}</span>
        <span class="p-year-top">${w.year || ''}</span>
      </div>
      <h1 class="p-title">${w.title}</h1>
      ${credits ? `<div class="p-credits">${credits}${cs.client ? ` · for <strong>${cs.client}</strong>` : ''}</div>` : ''}
      <div class="p-meta-row">
        ${w.caption ? `<p class="p-caption">${w.caption}</p>` : '<div></div>'}
        <div class="p-tags">${(w.tags || []).map((t) => `<span>${t}</span>`).join('')}</div>
      </div>
    </div>
    ${outcomeHTML}
    ${problemHTML}
    ${constraintsHTML}
    <div class="project-gallery">
      ${
        media.length
          ? media.map((m, gi) => renderGalleryItem(m, gi)).join('')
          : `<div style="padding:6rem;text-align:center;opacity:0.5;font-family:'IBM Plex Mono',monospace;letter-spacing:0.2em;text-transform:uppercase;">No images yet · draft</div>`
      }
    </div>
    ${awardsHTML}
    ${externalHTML}
    <div class="project-nav-next${isCrossSection ? ' is-cross-section' : ''}">
      <div class="pn-block">
        <div class="pn-label">${nextLabel}</div>
        <div class="pn-title" id="pn-title">${next.title} →</div>
        <div class="pn-kbd-hint" aria-hidden="true">
          <kbd>←</kbd><kbd>→</kbd> to navigate · <kbd>esc</kbd> to close
        </div>
      </div>
      <div class="pn-arrow" id="pn-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
    </div>
  `
  const goNext = () =>
    navigate({view: 'project', id: nextSectionId, projectSlug: next.slug})
  document.getElementById('pn-title').addEventListener('click', goNext)
  document.getElementById('pn-arrow').addEventListener('click', goNext)
}

function openProjectDOM(works, idx, sectionId) {
  // If this project has video media, kick off the Mux loader.
  // We render immediately so the UI feels instant — once the player
  // module is registered, any <mux-player> tags in the DOM upgrade.
  const w = works[idx]
  const hasVideo = (w && (w.media || []).some((m) => m._type === 'videoItem' && m.playbackId))
  if (hasVideo) ensureMux()
  buildProject(works, idx, sectionId)
  projectView.classList.add('open')
  projectView.setAttribute('aria-hidden', 'false')
  projectView.dataset.sectionId = sectionId
  projectView.scrollTo(0, 0)
  if (projectProgressUpdate) projectProgressUpdate()
}
function closeProjectDOM() {
  projectView.classList.remove('open')
  projectView.setAttribute('aria-hidden', 'true')
  delete projectView.dataset.sectionId
}
projectBack.addEventListener('click', () => {
  // back to detail page for the section the project belongs to
  const sectionId = projectView.dataset.sectionId
  if (sectionId) navigate({view: 'detail', id: sectionId})
  else history.back()
})

detailInner.addEventListener('click', (e) => {
  const row = e.target.closest('.work-row')
  if (!row) return
  const idx = parseInt(row.dataset.idx, 10)
  const id = detailPage.dataset.sectionId || document.getElementById('illustration').dataset.id
  const p = PAGES[id]
  if (!p || !p.works.length) return
  const slug = p.works[idx] && p.works[idx].slug
  if (!slug) return
  navigate({view: 'project', id, projectSlug: slug})
})

/* Helper: find the previous project in global ALL_PROJECTS order
   (mirror of findNextProject — used for ← arrow nav in project view). */
function findPrevProject(sectionId, projectSlug) {
  if (!ALL_PROJECTS.length) return null
  const i = ALL_PROJECTS.findIndex((e) => e.sectionId === sectionId && e.work.slug === projectSlug)
  if (i < 0) return null
  return ALL_PROJECTS[(i - 1 + ALL_PROJECTS.length) % ALL_PROJECTS.length]
}

/* Helper: parse current project from project-view DOM state. */
function currentProjectRef() {
  if (!projectView.classList.contains('open')) return null
  const sectionId = projectView.dataset.sectionId
  // Pull the slug out of the URL — already authoritative since router synced.
  const segs = location.pathname.split('/').filter(Boolean)
  const slug = segs[1] ? decodeURIComponent(segs[1]) : null
  if (!sectionId || !slug) return null
  return {sectionId, projectSlug: slug}
}

document.addEventListener('keydown', (e) => {
  // ESC handling — order: 404 → project → detail
  if (e.key === 'Escape') {
    const notFound = document.getElementById('not-found')
    const lightbox = document.getElementById('lightbox')
    if (lightbox && lightbox.classList.contains('open')) {
      closeLightbox()
      return
    }
    if (notFound && notFound.classList.contains('open')) {
      navigate({view: 'landing'})
    } else if (projectView.classList.contains('open')) {
      const sectionId = projectView.dataset.sectionId
      if (sectionId) navigate({view: 'detail', id: sectionId})
      else history.back()
    } else if (detailPage.classList.contains('open')) {
      navigate({view: 'landing'})
    }
    return
  }

  // ← / → arrow keys: prev/next image in lightbox, OR prev/next project.
  if (
    (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
    !e.metaKey && !e.ctrlKey && !e.altKey
  ) {
    const target = e.target
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    // Lightbox takes priority over project nav
    if (lightboxEl && lightboxEl.classList.contains('open')) {
      e.preventDefault()
      if (e.key === 'ArrowLeft') lightboxPrev()
      else lightboxNext()
      return
    }
    if (projectView.classList.contains('open')) {
      const cur = currentProjectRef()
      if (!cur) return
      const ref = e.key === 'ArrowRight'
        ? findNextProject(cur.sectionId, cur.projectSlug)
        : findPrevProject(cur.sectionId, cur.projectSlug)
      if (ref) {
        e.preventDefault()
        navigate({view: 'project', id: ref.sectionId, projectSlug: ref.work.slug})
      }
    }
  }
})

/* ─── Illustration click → open detail (bbox-gated) ─────────────── */
document.getElementById('illustration').addEventListener('click', (e) => {
  const bb = bbox || charBBox()
  if (!bb) return
  if (
    e.clientX >= bb.minX &&
    e.clientX <= bb.maxX &&
    e.clientY >= bb.minY &&
    e.clientY <= bb.maxY
  ) {
    const id = document.getElementById('illustration').dataset.id
    navigate({view: 'detail', id})
  }
})

/* ─── ROUTER (URL ↔ view state) ──────────────────────────────────────────
   Public URLs:  /                        → landing
                 /originals               → Originals detail
                 /bubble                  → Bubble detail
                 /madplus                 → MAD+ detail (internal slug "music")
                 /vision                  → Vision detail
                 /<section>/<projectSlug> → project view inside that section
   Browser back/forward, refresh, and shared deep-links all work via popstate.
*/
const URL_TO_ID = {originals: 'originals', bubble: 'bubble', madplus: 'music', vision: 'vision'}
const ID_TO_URL = {originals: 'originals', bubble: 'bubble', music: 'madplus', vision: 'vision'}

function parseRoute(pathname) {
  const segs = (pathname || location.pathname).split('/').filter(Boolean)
  if (!segs.length) return {view: 'landing'}
  // Custom inline editor at /admin (lazy-loaded — see openAdminDOM)
  if (segs[0].toLowerCase() === 'admin') {
    return {view: 'admin', sub: segs.slice(1).join('/') || ''}
  }
  const id = URL_TO_ID[segs[0].toLowerCase()]
  if (!id) return {view: 'notfound', path: pathname || location.pathname}
  if (segs.length === 1) return {view: 'detail', id}
  return {view: 'project', id, projectSlug: decodeURIComponent(segs[1])}
}

function urlForRoute(r) {
  if (r.view === 'landing') return '/'
  if (r.view === 'admin') return r.sub ? `/admin/${r.sub}` : '/admin'
  if (r.view === 'notfound') return r.path || '/404'
  const seg = ID_TO_URL[r.id] || r.id
  if (r.view === 'project') return `/${seg}/${encodeURIComponent(r.projectSlug)}`
  return `/${seg}`
}

function titleForRoute(r) {
  const tagline = SITE.tagline || 'Creativity is madness with a deadline.'
  const base = `MAD Studio — ${tagline}`
  if (r.view === 'landing') return base
  if (r.view === 'admin') return `Admin · MAD Studio`
  if (r.view === 'notfound') return `404 — Page not found · MAD Studio`
  const sec = SECTIONS.find((s) => s.id === r.id)
  const secTitle = sec ? sec.cTitle : r.id
  if (r.view === 'detail') return `${secTitle} — MAD Studio`
  const p = PAGES[r.id]
  const w = p && p.works.find((w) => w.slug === r.projectSlug)
  return `${w ? w.title : r.projectSlug} — ${secTitle} — MAD Studio`
}

function setNotFoundVisible(show, path) {
  const el = document.getElementById('not-found')
  if (!el) return
  if (show) {
    // Populate the displayed path (the URL the user actually typed)
    const safePath = path || location.pathname || '/'
    const displayEl = document.getElementById('nf-path-display')
    const inlineEl = document.getElementById('nf-path-inline')
    if (displayEl) displayEl.textContent = safePath
    if (inlineEl) inlineEl.textContent = safePath
    // Build the recovery section grid (one card per top-level section)
    const grid = document.getElementById('nf-recovery')
    if (grid && !grid.dataset.built) {
      grid.innerHTML = SECTIONS.map(
        (s, i) => `
          <button class="nf-card" type="button" data-id="${s.id}" data-idx="${i}">
            <div>
              <div class="nf-card-num">${String(i + 1).padStart(2, '0')} / 0${SECTIONS.length}</div>
              <h3 class="nf-card-title">${s.cTitle}</h3>
              <p class="nf-card-sub">${(s.cSub || '').replace(/\.$/, '')}</p>
            </div>
            <span class="nf-card-arrow" aria-hidden="true">↗</span>
          </button>
        `,
      ).join('')
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.nf-card')
        if (!card) return
        const id = card.dataset.id
        if (id) navigate({view: 'detail', id})
      })
      grid.dataset.built = '1'
    }
    el.classList.add('open')
    el.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    setEnterPillVisible(false)
    el.scrollTo(0, 0)
  } else {
    el.classList.remove('open')
    el.setAttribute('aria-hidden', 'true')
  }
}

function applyRoute(r) {
  document.title = titleForRoute(r)
  if (r.view === 'notfound') {
    if (projectView.classList.contains('open')) closeProjectDOM()
    if (detailPage.classList.contains('open')) closeDetailDOM()
    setNotFoundVisible(true, r.path)
    return
  }
  // any non-404 route: hide the 404 overlay if it was up
  setNotFoundVisible(false)
  // Custom admin panel — lazy-loaded module
  if (r.view === 'admin') {
    if (projectView.classList.contains('open')) closeProjectDOM()
    if (detailPage.classList.contains('open')) closeDetailDOM()
    openAdmin(r.sub)
    return
  }
  // Hide admin overlay if leaving it
  closeAdmin()
  if (r.view === 'landing') {
    if (projectView.classList.contains('open')) closeProjectDOM()
    if (detailPage.classList.contains('open')) closeDetailDOM()
    document.body.style.overflow = ''
    return
  }
  if (r.view === 'detail') {
    if (projectView.classList.contains('open')) closeProjectDOM()
    openDetailDOM(r.id)
    return
  }
  // r.view === 'project'
  const p = PAGES[r.id]
  if (!p) {
    history.replaceState({view: 'landing'}, '', '/')
    applyRoute({view: 'landing'})
    return
  }
  const pIdx = p.works.findIndex((w) => w.slug === r.projectSlug)
  if (pIdx < 0) {
    // unknown project slug → fall back to that section's detail
    const fallback = {view: 'detail', id: r.id}
    history.replaceState(fallback, '', urlForRoute(fallback))
    openDetailDOM(r.id)
    return
  }
  openDetailDOM(r.id)
  openProjectDOM(p.works, pIdx, r.id)
}

function navigate(r, {replace = false} = {}) {
  const url = urlForRoute(r)
  if (replace) history.replaceState(r, '', url)
  else history.pushState(r, '', url)
  applyRoute(r)
}

window.addEventListener('popstate', (e) => {
  const r = e.state && e.state.view ? e.state : parseRoute()
  applyRoute(r)
})

// 404 page → topbar back button + footer home button (both → landing)
{
  const goHome = () => navigate({view: 'landing'})
  const backBtn = document.getElementById('not-found-back')
  if (backBtn) backBtn.addEventListener('click', goHome)
  const footerHome = document.getElementById('nf-home-btn')
  if (footerHome) footerHome.addEventListener('click', goHome)
}

// Initial route — handle deep links and refresh-mid-flow
{
  const initRoute = parseRoute()
  // We don't replaceState for 404 — keep the URL the user typed so they
  // can correct it. The overlay tells them what's going on.
  if (initRoute.view !== 'notfound') {
    history.replaceState(initRoute, '', urlForRoute(initRoute))
  } else {
    history.replaceState(initRoute, '', location.pathname)
  }
  if (initRoute.view !== 'landing') applyRoute(initRoute)
  else document.title = titleForRoute(initRoute)
}

/* ─── Custom cursor ─────────────────────────────── */
const cursor = document.createElement('div')
cursor.className = 'cursor'
cursor.innerHTML = '<div class="cursor-ring"></div><div class="cursor-label">View</div>'
document.body.appendChild(cursor)

let cx = window.innerWidth / 2,
  cy = window.innerHeight / 2
let tx = cx,
  ty = cy
window.addEventListener('mousemove', (e) => {
  tx = e.clientX
  ty = e.clientY
})
function rafCursor() {
  cx += (tx - cx) * 0.22
  cy += (ty - cy) * 0.22
  cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`
  // 3D-tilt parallax on illustration following cursor
  updateAvatarParallax(tx, ty)
  requestAnimationFrame(rafCursor)
}

/* ─── 3D AVATAR PARALLAX (fake 3D: tilt + translation + floor shift) ───
   Respects prefers-reduced-motion: skips entirely if user prefers reduced. */
const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
let prefersReducedMotion = !!(reduceMotion && reduceMotion.matches)
if (reduceMotion && reduceMotion.addEventListener) {
  reduceMotion.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches
  })
}
let avatarRotX = 0, avatarRotY = 0
let avatarTx = 0, avatarTy = 0
let shadowShift = 0
function updateAvatarParallax(mx, my) {
  if (prefersReducedMotion) return
  const illus = document.getElementById('illustration')
  if (!illus) return
  const stage = illus.querySelector('.avatar-stage')
  const target = stage || illus
  const r = target.getBoundingClientRect()
  if (!r.width) return
  const centerX = r.left + r.width / 2
  const centerY = r.top + r.height / 2
  // normalize cursor offset to [-1, 1] relative to viewport
  const nx = Math.max(-1, Math.min(1, (mx - centerX) / (window.innerWidth / 2)))
  const ny = Math.max(-1, Math.min(1, (my - centerY) / (window.innerHeight / 2)))
  // gentler tilt: ±10° Y / ±7° X — less robotic, more natural
  const targetRotY = nx * 10
  const targetRotX = -ny * 7
  // subtle translation toward cursor — adds parallax depth (head shifts a bit)
  const targetTx = nx * 14
  const targetTy = ny * 10
  // shadow shifts opposite to head tilt
  const targetShadowShift = -nx * 18
  // smooth lerps (slower for more natural feel)
  avatarRotY += (targetRotY - avatarRotY) * 0.07
  avatarRotX += (targetRotX - avatarRotX) * 0.07
  avatarTx += (targetTx - avatarTx) * 0.08
  avatarTy += (targetTy - avatarTy) * 0.08
  shadowShift += (targetShadowShift - shadowShift) * 0.07
  illus.style.setProperty('--avatar-rx', avatarRotX.toFixed(2) + 'deg')
  illus.style.setProperty('--avatar-ry', avatarRotY.toFixed(2) + 'deg')
  illus.style.setProperty('--avatar-tx', avatarTx.toFixed(1) + 'px')
  illus.style.setProperty('--avatar-ty', avatarTy.toFixed(1) + 'px')
  illus.style.setProperty('--shadow-shift', shadowShift.toFixed(1))
}

rafCursor()

const illusEl = document.querySelector('.illustration')
function charBBox() {
  // Prefer PNG avatar bounds (current setup); fall back to SVG paths if any
  const png = illusEl.querySelector('.avatar3d')
  if (png) {
    const r = png.getBoundingClientRect()
    if (r.width > 0) return {minX: r.left, minY: r.top, maxX: r.right, maxY: r.bottom}
  }
  const svg = illusEl.querySelector('svg')
  if (!svg) return null
  const shapes = svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse')
  if (!shapes.length) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  shapes.forEach((s) => {
    const r = s.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    if (r.left < minX) minX = r.left
    if (r.top < minY) minY = r.top
    if (r.right > maxX) maxX = r.right
    if (r.bottom > maxY) maxY = r.bottom
  })
  return {minX, minY, maxX, maxY}
}
let bbox = charBBox()
window.addEventListener('resize', () => {
  bbox = charBBox()
})
const mo = new MutationObserver(() => {
  setTimeout(() => {
    bbox = charBBox()
  }, 50)
})
mo.observe(illusEl, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-id']})

window.addEventListener('mousemove', (e) => {
  let hover = false
  const t = e.target
  if (t && t.closest && t.closest('.work-row')) {
    hover = true
  } else if (!detailPage.classList.contains('open') && !projectView.classList.contains('open')) {
    if (!bbox) bbox = charBBox()
    if (
      bbox &&
      e.clientX >= bbox.minX &&
      e.clientX <= bbox.maxX &&
      e.clientY >= bbox.minY &&
      e.clientY <= bbox.maxY
    ) {
      hover = true
    }
  }
  if (hover) cursor.classList.add('hover')
  else cursor.classList.remove('hover')
})

/* ─── Apply site settings to static header ─────────────── */
if (SITE.tagline) {
  const el = document.querySelector('.tagline')
  if (el) el.textContent = SITE.tagline
}
if (SITE.websiteUrl && SITE.websiteUrlLabel) {
  const el = document.querySelector('.website')
  if (el) {
    el.href = SITE.websiteUrl
    el.textContent = SITE.websiteUrlLabel
  }
}

/* hide loading state */
document.body.classList.remove('loading')
