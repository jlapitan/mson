import React from 'react';
import Field from './field';
import IconButton from '@material-ui/core/IconButton';
import Icon from '../icon';
import FlexBreak from '../flex-break';
import attach from '../attach';
import HelpToolTip from './help-tool-tip';

class ListItemField extends React.PureComponent {
  handleDelete = () => {
    this.props.component.emit('delete');
  };

  render() {
    // Note: allowDelete and help have to be passed in as a prop as it is really the parent's values
    // that we need
    const { component, allowDelete, help } = this.props;
    const disabled = component.get('disabled');
    const editable = component.get('editable');

    if (component) {
      const block = component.get('block');
      const isBlank = component.isBlank();

      return (
        <span>
          <Field component={component} block={false} />
          {allowDelete && !isBlank && !disabled && editable ? (
            <IconButton aria-label="Delete">
              <Icon icon="DeleteIcon" onClick={this.handleDelete} />
            </IconButton>
          ) : null}
          {help && editable ? <HelpToolTip help={help} /> : ''}
          {block ? <FlexBreak /> : null}
        </span>
      );
    } else {
      // component can be falsy if it was just deleteed
      return null;
    }
  }
}

// We want the component to update when the value changes as blank fields should not display a
// delete button
export default attach(['value', 'disabled', 'editable'])(ListItemField);
