import { invariant, nonexhaustive, type c4 } from '@likec4/core'
import { ast } from './ast'

export function isElementRefHead(node: ast.ElementRef | ast.StrictElementRef) {
  if (ast.isElementRef(node)) {
    return !ast.isElementRef(node.$container)
  }
  if (ast.isStrictElementRef(node)) {
    return !ast.isStrictElementRef(node.$container)
  }
  nonexhaustive(node)
}

export function elementRef(node: ast.ElementRef | ast.StrictElementRef) {
  invariant(isElementRefHead(node), 'Expected head ElementRef')
  while (node.next) {
    node = node.next
  }
  return node.el.ref
}

export function strictElementRefFqn(node: ast.StrictElementRef): c4.Fqn {
  invariant(isElementRefHead(node), 'Expected head StrictElementRef')
  const name = [node.el.$refText]
  let child = node.next
  while (child) {
    name.push(child.el.$refText)
    child = child.next
  }
  return name.join('.') as c4.Fqn
}

export function parentStrictElementRef(node: ast.StrictElementRef): c4.Fqn {
  invariant(!isElementRefHead(node), 'Expected next StrictElementRef')
  const path = []
  let parent = node.$container
  while (ast.isStrictElementRef(parent)) {
    path.unshift(parent.el.$refText)
    parent = parent.$container
  }
  invariant(path.length > 0, 'Expected non-empty parent path')
  return path.join('.') as c4.Fqn
}
