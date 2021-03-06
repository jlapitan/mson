import Field from './field';

export default class TextField extends Field {
  _className = 'TextField';

  _create(props) {
    super._create(props);

    this._requireString = true;

    this.set({
      schema: {
        component: 'Form',
        fields: [
          {
            name: 'minLength',
            component: 'IntegerField'
          },
          {
            name: 'maxLength',
            component: 'IntegerField'
          },
          {
            name: 'minWords',
            component: 'IntegerField'
          },
          {
            name: 'maxWords',
            component: 'IntegerField'
          },
          {
            // TODO: define list of acceptable values
            name: 'type',
            component: 'TextField'
          },
          {
            name: 'invalidRegExp',
            component: 'TextField'
          },
          {
            name: 'multiline',
            component: 'BooleanField'
          },
          {
            name: 'rows',
            component: 'IntegerField'
          },
          {
            name: 'rowsMax',
            component: 'IntegerField'
          }
        ]
      }
    });
  }

  _toValidatorProps() {
    const value = this.get('value');

    return {
      ...super._toValidatorProps(),
      length: value.length,
      words: value.split(/\s+/).length
    };
  }

  validate() {
    super.validate();

    if (!this.isBlank()) {
      const value = this.getValue();
      if (typeof value === 'string') {
        const minLength = this.get('minLength');
        const maxLength = this.get('maxLength');
        const invalidRegExp = this.get('invalidRegExp');

        if (minLength !== null && value.length < minLength) {
          this.setErr(`${minLength} characters or more`);
        } else if (maxLength !== null && value.length > maxLength) {
          this.setErr(`${maxLength} characters or less`);
        } else if (invalidRegExp && new RegExp(invalidRegExp).test(value)) {
          this.setErr(`invalid`);
        }
      } else if (this._requireString) {
        this.setErr(`must be a string`);
      }
    }

    // TODO: minWords, maxWords
  }
}
