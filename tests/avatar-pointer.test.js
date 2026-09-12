import test from 'node:test'
import assert from 'node:assert/strict'
import {viewportGaze, bindViewportGaze} from '../src/avatar-pointer.js'
const rect = {left:400,top:200,width:200,height:300}
const viewport = {width:1000,height:800}
test('gaze stays bounded across the full screen with neutral eyes at the avatar centre', () => {
  assert.deepEqual(viewportGaze({clientX:500,clientY:350},rect,viewport),[0,-0])
  assert.deepEqual(viewportGaze({clientX:1000,clientY:0},rect,viewport),[1,1])
  assert.deepEqual(viewportGaze({clientX:-50,clientY:1000},rect,viewport),[-1,-1])
  assert.ok(viewportGaze({clientX:850,clientY:350},rect,viewport)[0] > 0)
  assert.ok(viewportGaze({clientX:850,clientY:350},rect,viewport)[0] < 1)
})
test('tracking survives leaving the avatar, honours inactive state, and cleans up global listeners', () => {
  const target = new EventTarget(), root = new EventTarget()
  Object.assign(target,{innerWidth:1000,innerHeight:800})
  let active=true, calls=[], resets=0
  const send=(type,props={},node=target)=>node.dispatchEvent(Object.assign(new Event(type),props))
  const dispose=bindViewportGaze({target,root,getRect:()=>rect,enabled:()=>active,onGaze:(...p)=>calls.push(p),onReset:()=>resets++})
  send('pointermove',{clientX:900,clientY:400,pointerType:'mouse'})
  assert.equal(calls.length,1)
  send('pointerleave',{relatedTarget:{}},root)
  assert.equal(resets,0)
  active=false
  send('pointermove',{clientX:0,clientY:0,pointerType:'mouse'})
  assert.equal(calls.length,1)
  send('blur'); assert.equal(resets,1)
  send('pointermove',{pointerType:'touch'}); assert.equal(resets,2)
  send('pointerleave',{relatedTarget:null},root); assert.equal(resets,3)
  dispose()
  active=true
  send('pointermove',{clientX:0,clientY:0,pointerType:'mouse'})
  send('blur')
  assert.equal(calls.length,1); assert.equal(resets,3)
})
