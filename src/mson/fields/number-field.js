import TextField from './text-field';

export default class NumberField extends TextField {
  _className = 'NumberField';

  _create(props) {
    super._create(props);

    this._requireString = false;

    this.set({
      schema: {
        component: 'Form',
        fields: [
          {
            name: 'minValue',
            component: 'NumberField'
          },
          {
            name: 'maxValue',
            component: 'NumberField'
          }
        ]
      }
    });
  }

  _validateLengths() {
    if (!this.isBlank()) {
      const value = this.getValue();
      const minValue = this.get('minValue');
      const maxValue = this.get('maxValue');

      if (minValue !== null && value < minValue) {
        this.setErr(`must be ${minValue} or greater`);
      } else if (maxValue !== null && value > maxValue) {
        this.setErr(`must be ${maxValue} or less`);
      }
    }
  }

  validate() {
    super.validate();

    this._validateWithRegExp(/^([+-]?\d*\.?\d*)$/, 'not a number');

    if (!this.hasErr()) {
      this._validateLengths();
    }
  }
}
