import { expect, test } from 'vitest'
import { fakeDiagram, fakeDiagram2, fakeComputedView3Levels, fakeWithColorsAndShapes } from '../__mocks__/data'
import { generateMermaid } from './generate-mmd'

test('generate mermaid - fakeDiagram', () => {
  expect(generateMermaid(fakeDiagram)).toMatchSnapshot()
})

test('generate mermaid - fakeDiagram2', () => {
  expect(generateMermaid(fakeDiagram2)).toMatchSnapshot()
})

test('generate mermaid - fakeComputedView 3 Levels', () => {
  expect(generateMermaid(fakeComputedView3Levels)).toMatchSnapshot()
})

test('generate mermaid - with colors and shapes', () => {
  expect(generateMermaid(fakeWithColorsAndShapes)).toMatchSnapshot()
})
