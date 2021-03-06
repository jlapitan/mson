import React from 'react';
import InputLabel from '@material-ui/core/InputLabel';
import FormLabel from '@material-ui/core/FormLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '../form-control';
import attach from '../attach';
import HelpToolTip from './help-tool-tip';
import withStyles from '@material-ui/core/styles/withStyles';

const styles = theme => ({
  label: {
    fontSize: theme.typography.caption.fontSize
  }
});

class CommonField extends React.PureComponent {
  render() {
    const {
      component,
      children,
      label,
      required,
      fullWidth,
      err,
      editable,
      touched,
      help,
      hideLabelUI,
      hideLabel,
      classes,
      useDisplayValue,
      shrinkLabel
    } = this.props;

    let fld = null;

    let lbl = null;

    const isBlank = component.isBlank();

    if (!hideLabelUI && !hideLabel) {
      if (editable && !useDisplayValue) {
        lbl = (
          <InputLabel
            error={touched && err ? true : false}
            // If label is blank then don't show as required
            required={label && required}
            shrink={shrinkLabel}
          >
            {label}
          </InputLabel>
        );
      } else {
        // We display a non-breaking space when the label is empty so that CompositeFields, like the
        // ChainedSelectField, print all their display values on the same line.
        const labelText = label ? label : '\u00A0';

        // We wrap the label in a div tag so that the proceeding display value appears on a
        // different line
        lbl = (
          <div>
            <FormLabel className={classes.label}>{labelText}</FormLabel>
          </div>
        );
      }
    }

    const firstErr = component.getFirstErr();

    fld = (
      <span>
        {lbl}
        {children}
        {help && editable ? <HelpToolTip help={help} /> : ''}
        {touched && err ? (
          <FormHelperText error>{firstErr}</FormHelperText>
        ) : null}
      </span>
    );

    if (editable || !isBlank) {
      return <FormControl fullWidth={fullWidth}>{fld}</FormControl>;
    } else {
      return null;
    }
  }
}

// 'value' is needed in the event we are showing the display value
CommonField = attach([
  'label',
  'required',
  'fullWidth',
  'value',
  'err',
  'editable',
  'touched',
  'help',
  'hideLabel',
  'useDisplayValue'
])(CommonField);

export default withStyles(styles)(CommonField);
