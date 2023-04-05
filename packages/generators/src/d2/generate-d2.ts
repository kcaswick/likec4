import type { ComputedEdge, ComputedNode, ComputedView, NodeId } from '@likec4/core/types'
import { CompositeGeneratorNode, NL, joinToNode, toString } from 'langium'
import { isNil } from 'rambdax'

const capitalizeFirstLetter = (value: string) =>
  value.charAt(0).toLocaleUpperCase() + value.slice(1)

const fqnName = (nodeId: string): string => nodeId.split('.').map(capitalizeFirstLetter).join('')

const nodeName = (node: ComputedNode): string => {
  return fqnName(node.parent ? node.id.slice(node.parent.length + 1) : node.id)
}

const d2shape = ({ shape }: ComputedNode) => {
  switch (shape) {
    case 'queue':
    case 'cylinder':
    case 'rectangle':
    case 'person': {
      return shape
    }
    case 'storage': {
      return 'stored_data' as const
    }
    case 'browser': {
      return 'rectangle' as const
    }
  }
}

export function generateD2<V extends ComputedView>({ nodes, edges }: V) {
  const names = new Map<NodeId, string>()

  const printNode = (node: ComputedNode, parentName?: string): CompositeGeneratorNode => {
    const name = nodeName(node)
    const fqnName = (parentName ? parentName + '.' : '') + name
    names.set(node.id, fqnName)

    const label = node.title.replaceAll('\n', '\\n')
    const shape = d2shape(node)

    return new CompositeGeneratorNode()
      .append(name, ': {', NL)
      .indent({
        indentedChildren: (indent) => indent
          .append('label: "', label, '"', NL)
          .append('shape: ', shape, NL)
          .appendIf(node.children.length > 0,
            NL,
            joinToNode(
              nodes.filter(n => n.parent === node.id),
              n => printNode(n, fqnName)
            )
          ),
        indentation: 2
      })
      .append('}', NL)
  }
  //     return `${names.get(edge.source)} -> ${names.get(edge.target)}${edge.label ? ': ' + edge.label : ''}`
  const printEdge = (edge: ComputedEdge): CompositeGeneratorNode => {
    return new CompositeGeneratorNode()
      .append(
        names.get(edge.source),
        ' -> ',
        names.get(edge.target),
      )
      .append(out =>
        edge.label && out.append(': ', edge.label.replaceAll('\n', ' '))
      )
  }

  return toString(new CompositeGeneratorNode()
    .append(
      joinToNode(
        nodes.filter(n => isNil(n.parent)),
        n => printNode(n),
        {
          appendNewLineIfNotEmpty: true,
        }
      ),
    )
    .appendIf(edges.length > 0,
      NL,
      joinToNode(
        edges,
        e => printEdge(e),
        {
          appendNewLineIfNotEmpty: true,
        }
      ),
    )
  )
}