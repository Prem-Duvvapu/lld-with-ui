// classDiagrams — featureflag
export default {
  title: 'Feature Flag — Class Diagram',
  classes: [
    {
      name: 'FeatureFlagService',
      stereotype: 'singleton',
      fields: ['- repository: FeatureFlagRepository'],
      methods: [
        '+ createFlag(key, description): FeatureFlag',
        '+ setEnabled(key, enabled): FeatureFlag',
        '+ updateRules(key, newRoot): FeatureFlag',
        '+ evaluate(key, ctx): EvaluationResult',
      ],
    },
    {
      name: 'FeatureFlag',
      fields: [
        '- key: String',
        '- volatile enabled: boolean',
        '- volatile rule: Condition',
      ],
      methods: ['+ getRuleDescription(): String'],
    },
    {
      name: 'Condition',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ evaluate(ctx): boolean',
        '+ describe(): String',
      ],
    },
    {
      name: 'CountryCondition',
      fields: ['- country: String'],
      methods: [],
    },
    {
      name: 'UserIdCondition',
      fields: ['- allowedUserIds: Set<String>'],
      methods: [],
    },
    {
      name: 'AttributeEqualsCondition',
      fields: ['- key: String', '- expectedValue: String'],
      methods: [],
    },
    {
      name: 'PercentageRolloutCondition',
      fields: ['- percentage: int'],
      methods: [],
    },
    {
      name: 'AndCondition',
      fields: ['- children: List<Condition>'],
      methods: [],
    },
    {
      name: 'OrCondition',
      fields: ['- children: List<Condition>'],
      methods: [],
    },
    {
      name: 'NotCondition',
      fields: ['- child: Condition'],
      methods: [],
    },
    {
      name: 'ConditionTreeBuilder',
      fields: [],
      methods: ['+ build(ruleNode): Condition'],
    },
    {
      name: 'UserContext',
      fields: [
        '- userId: String',
        '- country: String',
        '- attributes: Map<String, String>',
      ],
      methods: [],
    },
    {
      name: 'EvaluationResult',
      fields: [
        '- matched: boolean',
        '- explanation: String',
      ],
      methods: [],
    },
  ],
  relationships: [
    { from: 'CountryCondition', to: 'Condition', label: 'implements', dashed: true },
    { from: 'UserIdCondition', to: 'Condition', label: 'implements', dashed: true },
    { from: 'AttributeEqualsCondition', to: 'Condition', label: 'implements', dashed: true },
    { from: 'PercentageRolloutCondition', to: 'Condition', label: 'implements', dashed: true },
    { from: 'AndCondition', to: 'Condition', label: 'implements', dashed: true },
    { from: 'OrCondition', to: 'Condition', label: 'implements', dashed: true },
    { from: 'NotCondition', to: 'Condition', label: 'implements', dashed: true },
    { from: 'AndCondition', to: 'Condition', label: 'composes' },
    { from: 'OrCondition', to: 'Condition', label: 'composes' },
    { from: 'NotCondition', to: 'Condition', label: 'composes' },
    { from: 'ConditionTreeBuilder', to: 'Condition', label: 'creates' },
    { from: 'FeatureFlag', to: 'Condition', label: 'has rule' },
    { from: 'FeatureFlagService', to: 'FeatureFlag', label: 'manages' },
    { from: 'Condition', to: 'UserContext', label: 'evaluates against' },
    { from: 'FeatureFlagService', to: 'EvaluationResult', label: 'produces' },
  ],
};
