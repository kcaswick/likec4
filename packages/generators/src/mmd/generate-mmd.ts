import { Colors, DefaultThemeColor } from '@likec4/core'
import type { ComputedEdge, ComputedNode, ComputedView, NodeId } from '@likec4/core/types'
import { CompositeGeneratorNode, NL, joinToNode, toString } from 'langium'
import { isNil } from 'rambdax'

const capitalizeFirstLetter = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1)

const fqnName = (nodeId: string): string => nodeId.split('.').map(capitalizeFirstLetter).join('')

const nodeName = (node: ComputedNode): string => {
  return fqnName(node.parent ? node.id.slice(node.parent.length + 1) : node.id)
}

const mmdshape = ({ shape }: ComputedNode): [start: string, end: string] => {
  switch (shape) {
    case 'queue':
    case 'cylinder':
      return ['[(', ')]']
    case 'person': {
      return ['[fa:fa-user ', ']']
    }
    case 'storage':
      return ['([', '])']
    case 'mobile':
    case 'browser':
    case 'rectangle': {
      return ['[', ']']
    }
  }
}

export function generateMermaid<V extends ComputedView>(view: V) {
  const { nodes, edges } = view
  const names = new Map<NodeId, string>()

  const printNode = (node: ComputedNode, parentName?: string): CompositeGeneratorNode => {
    const name = nodeName(node)
    const fqnName = (parentName ? parentName + '.' : '') + name
    names.set(node.id, fqnName)

    const label = nodeLabel(node)
    const shape = mmdshape(node)

    const baseNode = new CompositeGeneratorNode()

    if (node.children.length > 0) {
      baseNode
        .append('subgraph ', fqnName, '[')
        .indent({
          indentedChildren: indent =>
            indent.append(label, ']', NL).appendIf(
              node.children.length > 0,
              NL,
              joinToNode(
                nodes.filter(n => n.parent === node.id),
                n => printNode(n, fqnName)
              )
            ),
          indentImmediately: false,
          indentation: 2
        })
        .append('end', NL)
    } else {
      baseNode.append(fqnName, shape[0], label, shape[1], NL)
    }

    baseNode.appendIf(
      node.color !== DefaultThemeColor,
      'style ',
      fqnName,
      ' fill:',
      Colors[node.color].fill,
      ',stroke:',
      Colors[node.color].stroke,
      ',color:',
      Colors[node.color].hiContrast,
      NL
    )
    return baseNode
  }
  //     return `${names.get(edge.source)} -> ${names.get(edge.target)}${edge.label ? ': ' + edge.label : ''}`
  const printEdge = (edge: ComputedEdge): CompositeGeneratorNode => {
    return new CompositeGeneratorNode().append(
      names.get(edge.source),
      ' --',
      edge.label ? '"' + edge.label.replaceAll('\n', '\\n') + '"--' : '',
      '> ',
      names.get(edge.target)
    )
  }

  return toString(
    new CompositeGeneratorNode()
      .appendIf(view.title !== null && view.title.length > 0, '---', NL, `title: ${view.title}`, NL, '---', NL)
      .append('graph ', view.autoLayout, NL, NL)
      .append(
        joinToNode(
          nodes.filter(n => isNil(n.parent)),
          n => printNode(n),
          {
            appendNewLineIfNotEmpty: true
          }
        )
      )
      .appendIf(
        edges.length > 0,
        NL,
        joinToNode(edges, e => printEdge(e), {
          appendNewLineIfNotEmpty: true
        })
      )
  )
}

function nodeLabel(node: ComputedNode) {
  // The following regexs are based on the Mermaid parser at https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/diagrams/flowchart/parser/flow.jison
  const RE_UNICODE_TEXT = /[\u0100-\uFFFF]/u // /[\p{L}--[\u0000-\u00A9]]/v;
  const RE_START_TEXT = /(?<=\(\[|\[\[|[^\-]>|\[\)|\(\(\(|\||\(|\[|\{)/u // Note that most mmdshapes are here, except ellipse and trapezoid which forbid more punctuation than the others
  const RE_CONTINUE_TEXT = /[^\[\]\(\)\{\}\|\"]+/ // This can only be used to continue text once started
  // Note: double quote was removed from the character class below from NODE_STRING - in the jison file other rules usually prevent it from matching
  // const RE_NODE_STRING = /(?:[A-Za-z0-9!\#$%&'*+\.`?\\_\/]|-(?=[^\>\-\.])|=(?!=))+/v;
  // const RE_textNoTags = new RegExp(
  //   `^(?:${RE_NODE_STRING.source}|${/* RE_UNICODE_TEXT.source */""}|${(/[\d]+|[\s&:*#]|\^|[xo<]?(?:--|==|-\.)/u).source})+$`,
  //   'u'
  // )
  const RE_textNoTags =
    /^(?:(?:[A-Za-z0-9!#$%&'*+\.`?\\_\/]|-(?=[^>\-\.])|=(?!=))+|[\d]+|[\s&:*#]|\^|[xo<]?(?:--|==|-\.))+$/u
  const RE_STR = /^"[^"]+"$/u
  const RE_MD_STR = /^\"\`[^`"]+\`\"$/

  const isMultiline = Boolean(node.technology || node.description)
  const isPlainText = RE_textNoTags.test(node.title)
  const hasUnicodeText = RE_UNICODE_TEXT.test(node.title)

  if (!isMultiline) {
    if (isPlainText && !hasUnicodeText) {
      return node.title.replaceAll('\n', '\\n')
    }
    if (RE_STR.test(`"${node.title}"`)) {
      return `"${node.title}"`
    }
  }

  const useColor = node.color !== DefaultThemeColor

  return new CompositeGeneratorNode()
    .append(`"`)
    .appendIf(useColor, `<span style='color: ${Colors[node.color].hiContrast}'>`)
    .indent({
      indentedChildren: indent =>
        indent
          .append(joinToNode(node.title.replace(`"`, `&quot;`).split('\n'), i => i, { separator: NL }))
          .appendIf(useColor, '</span>')
          .appendIf(
            Boolean(node.technology),
            n =>
              n
                .appendNewLineIfNotEmpty()
                .append(`<span style='font-size:0.6em`)
                .appendIf(useColor, `; color: ${Colors[node.color].loContrast}`).appendTemplate`'>${joinToNode(
                node.technology?.replace(`"`, `&quot;`)?.split('\n') ?? [],
                i => i,
                { separator: NL }
              )}</span>`
          )
          .appendIf(
            Boolean(node.description),
            n =>
              n
                .appendNewLineIfNotEmpty()
                .append(`<span style='font-size:0.7em`)
                .appendIf(useColor, `; color: ${Colors[node.color].loContrast}`).appendTemplate`'>${joinToNode(
                node.description?.replace(`"`, `&quot;`)?.split('\n') ?? [],
                i => i,
                { separator: NL }
              )}</span>`
          )
          .append(`"`),
      indentImmediately: false,
      indentation: 2
    })
}
