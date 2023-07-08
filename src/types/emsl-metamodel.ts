/* Extended EMSL Metamodel */
export interface Metamodel {
  name: string
  classes: Class[]
  enums: Enum[]
}

export interface Enum {
  name: string
  values: string[]
}

export interface Class {
  name: string
  abstract?: boolean
  extends: string[]
  attributes?: Attribute[]
  associations?: Association[]
  partOf?: Dependency[]
}

export interface Dependency {
  class: string
  association: string
}

export interface Attribute {
  name: string
  type: string
}

export interface Association {
  name: string
  type: 'association' | 'aggregation' | 'composition'
  target: string
  lower: number
  upper?: number
  attributes: Attribute[]
}
