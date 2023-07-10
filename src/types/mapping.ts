export interface Correspondence {
  sourceClass: string
  targetClass: string
  name: string
}

export interface Mapping {
  options: MappingOption[]
  classMapping: ClassMapping[]
}

export interface MappingOption {
  name: string
  values: string[]
}

export interface ClassMapping {
  name?: string
  correspondenceName?: string
  source: string
  sourcePattern?: Pattern
  sourceModifier: Modifier
  target: string
  targetPattern?: Pattern
  targetModifier: Modifier
  properties?: PropertyMapping[]
}

export interface PropertyMapping {
  source: Property
  target: Property
  valueMapping: ValueMapping[]
}

export interface ValueMapping {
  source: AttributeType
  target: AttributeType
}

export type Property = string | AssociatedAttribute | Association

export type AttributeType = boolean | number | string | boolean[] | number[] | string[]
export type Pattern = Array<AttributeValueAssignment | Association>
export type AttributePattern = AttributeValueAssignment[]

export interface AssociatedAttribute {
  type: 'associated_attribute'
  associationName: string
  associationPattern?: Pattern
  targetPattern?: Pattern
  targetClass: string
  targetModifier: Modifier
  isOutgoing: boolean
  explicit?: boolean
  targetAttribute: string
}

export enum Modifier {
  create = 'create',
  exist = 'exist',
  any = 'any'
}

export type Create = boolean | string | string[]

export type AttributeAssignment = AttributeVariableAssignment | AttributeValueAssignment

export interface AttributeVariableAssignment {
  type: 'attribute_variable'
  name: string
  variable: string
}

export interface AttributeValueAssignment {
  type: 'attribute_value'
  name: string
  value: AttributeType
  parameter?: string
}

export interface Association {
  type: 'association'
  associationName: string
  associationPattern?: Pattern
  targetPattern?: Pattern
  targetClass: string
  targetModifier: Modifier
  isOutgoing: boolean
  explicit?: boolean
}

export interface AssociatedObject {
  associationName: string
  associationPattern?: Pattern
  objectName: string
  objectClass: string
  objectPattern?: Pattern
  isOutgoing: boolean
  create?: Create
}

export interface CorrespondenceObject {
  type: string
  sourceObjectName: string
  targetObjectName: string
  create: Create
}

export type RuleParameter = BooleanRuleParameter | IndexRuleParameter

export interface BooleanRuleParameter {
  valueType: 'boolean'
  type: string
  name: string
}

export interface IndexRuleParameter {
  valueType: 'index'
  name: string
  names: string[]
}

export type Constraint = IfThenConstraint | ForbidContraint
export interface IfThenConstraint {
  type: 'IfThenConstraint'
  name: string
  premiseName: string
  conclusionName: string
}

export interface ForbidContraint {
  type: 'ForbidContraint'
  name: string
  patternName: string
}

export type ConstraintPattern = ExistContraintPattern | BoundConstraintPattern | SetPattern | RootPattern

export interface ExistContraintPattern {
  type: 'ExistPattern'
  name: string
  class: string
}

export interface RootPattern {
  type: 'RootPattern'
  name: string
  class: string
}

export interface BoundConstraintPattern {
  type: 'BoundPattern'
  name: string
  sourceClass: string
  associationName: string
  bound: number
  targetClass: string
}

export interface SetPattern {
  type: 'SetPattern'
  name: string
  sourceClass: string
  associationName: string
  targetClass: string
}

export interface ClassUsage {
  all: string[]
  used: string[]
  unused: string[]
  created: string[]
  neverCreated: string[]
}
