import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import Input from '@material-ui/core/Input';
import Chip from '@material-ui/core/Chip';
import CommonField from './common-field';
import attach from '../attach';
import withStyles from '@material-ui/core/styles/withStyles';
import DisplayValueTypography from './display-value-typography';

const styles = theme => ({
  formControl: {
    // Specify a more appropriate min width so that the field is wide enough to cover most labels
    minWidth: 120
  },
  chip: {
    margin: theme.spacing.unit / 4
  }
});

class SelectField extends React.PureComponent {
  handleChange = event => {
    this.props.component.setValue(event.target.value);
  };

  handleBlur = () => {
    this.props.component.setTouched(true);
  };

  renderOptions() {
    const { options, blankString, value, multiple } = this.props;

    if (options) {
      let opts = [];

      if (!multiple && blankString) {
        // Note: the blankString doesn't make sense when we allow multiple selections
        opts.push(
          <MenuItem value="" key="">
            <em>{blankString}</em>
          </MenuItem>
        );
      }

      options.forEach(option => {
        if (multiple) {
          const checked = value ? value.indexOf(option.value) !== -1 : false;
          opts.push(
            <MenuItem value={option.value} key={option.value}>
              <Checkbox checked={checked} />
              <ListItemText primary={option.label} />
            </MenuItem>
          );
        } else {
          opts.push(
            <MenuItem value={option.value} key={option.value}>
              {option.label}
            </MenuItem>
          );
        }
      });

      return opts;
    }
  }

  render() {
    const {
      value,
      err,
      touched,
      disabled,
      component,
      fullWidth,
      classes,
      editable,
      multiple,
      accessEditable,
      useDisplayValue
    } = this.props;

    const dis = accessEditable === false || disabled;

    const options = this.renderOptions();

    let fieldValue = multiple ? [] : '';
    if (value) {
      fieldValue = value;
    }

    let input = undefined;
    let renderValue = undefined;
    if (multiple) {
      input = <Input />;

      // renderValue={selected => selected.join(', ')}
      renderValue = selected => (
        <div className={classes.chips}>
          {selected.map(value => (
            <Chip
              key={value}
              label={component.getOptionLabel(value)}
              className={classes.chip}
            />
          ))}
        </div>
      );
    }

    let fld = null;
    if (editable && !useDisplayValue) {
      fld = (
        <Select
          multiple={multiple}
          error={touched && err ? true : false}
          onChange={this.handleChange}
          onBlur={this.handleBlur}
          input={input}
          renderValue={renderValue}
          value={fieldValue}
          disabled={dis}
          fullWidth={fullWidth}
          className={classes.formControl}
        >
          {options}
        </Select>
      );
    } else {
      let displayValue = null;
      if (multiple && value) {
        displayValue = value.map(val => (
          <Chip
            key={val}
            label={component.getOptionLabel(val)}
            className={classes.chip}
          />
        ));
      } else {
        displayValue = component.getDisplayValue();
      }
      fld = <DisplayValueTypography>{displayValue}</DisplayValueTypography>;
    }

    return <CommonField component={component}>{fld}</CommonField>;
  }
}

SelectField = withStyles(styles)(SelectField);

export default attach([
  'value',
  'err',
  'options',
  'touched',
  'blankString',
  'disabled',
  'fullWidth',
  'editable',
  'multiple',
  'useDisplayValue'
])(SelectField);
