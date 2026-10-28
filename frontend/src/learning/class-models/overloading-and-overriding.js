export default {
  title: 'Printer overload and override model',
  summary: 'Parameter types identify overloads. Overriding replaces an inherited instance implementation for a selected signature.',
  classes: [{
    name: 'PromptPrinter', kind: 'public class', source: 'methodselection/PromptPrinter.java', description: 'Declares Object and String overloads, a final validation helper and a copy operation.',
    fields: [], methods: ['+ print(topic: Object): String', '+ print(topic: String): String', '# clean(topic: String): String {final}', '+ copy(): PromptPrinter {throws IOException}'],
  }, {
    name: 'HintPrinter', kind: 'public class', source: 'methodselection/HintPrinter.java', description: 'Overrides the String signature and adds a StringBuilder overload.',
    fields: [], methods: ['+ print(topic: String): String', '+ print(topic: StringBuilder): String', '+ copy(): HintPrinter'],
  }],
  relationships: [{ from: 'HintPrinter', to: 'PromptPrinter', kind: 'Generalization', explanation: 'extends inherits print(Object) and final clean, overrides print(String), and overrides copy with a covariant HintPrinter return and no declared checked exception.' }],
  notes: ['The compiler first selects an applicable overload using declared types. Runtime dispatch then chooses an override of that signature.', 'print(StringBuilder) is not an override. Uncast null is ambiguous between String and StringBuilder for HintPrinter.', 'copy returns a fresh object; neither implementation performs I/O. The checked exception belongs to the base declaration. Implicit constructors are omitted.'],
};
