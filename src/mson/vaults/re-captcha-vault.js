import Vault from './vault';

export default class ReCAPTCHAVault extends Vault {
  _className = 'ReCAPTCHAVault';

  _create(props) {
    super._create(props);

    this.set({
      schema: {
        component: 'Form',
        fields: [
          {
            name: 'secretKey',
            component: 'TextField'
          }
        ]
      }
    });
  }
}
