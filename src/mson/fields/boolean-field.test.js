import BooleanField from './boolean-field';
import testUtils from '../test-utils';

it('should validate', () => {
  const field = new BooleanField();

  testUtils.expectValuesToBeValid(field, [true, false, null]);

  testUtils.expectValuesToBeInvalid(
    field,
    [{}, [], 0, 1, 'foo'],
    'must be true or false'
  );

  field.set({ required: true });

  testUtils.expectValuesToBeValid(field, [true, false]);

  testUtils.expectValuesToBeInvalid(field, [null]);
});

it('should get display value', () => {
  const field = new BooleanField({ label: 'MyLabel' });
  expect(field.getDisplayValue()).toEqual('No');
  field.setValue(true);
  expect(field.getDisplayValue()).toEqual('Yes');
  field.setValue(false);
  expect(field.getDisplayValue()).toEqual('No');
});
