export interface ComponentContext {
  componentName: string
  jsx?: string
  props?: Record<string, unknown>
  markdown?: string
  source?: {
    fileName?: string
  }
  element?: {
    tagName: string
    className: string
    id: string
  }
}

export interface Workspace {
  port: number
  name: string
  path: string
}
