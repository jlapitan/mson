import ListField from './list-field';
import TextField from './text-field';

export default class TextListField extends ListField {
  _className = 'TextListField';

  _create(props) {
    super._create(props);

    this.set({
      schema: {
        component: 'Form',
        fields: [
          {
            name: 'invalidRegExp',
            component: 'TextField'
          }
        ]
      }
    });
  }

  _newField(index) {
    return new TextField({
      name: index,
      label: index === 0 ? this.get('label') : undefined,
      required: false,
      block: this.get('block'),
      fullWidth: this.get('fullWidth'),
      invalidRegExp: this.get('invalidRegExp')
    });
  }
}
