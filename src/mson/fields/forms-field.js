// TODO: what to do about doc store? Is it even needed as all data is stored locally via form. Maybe
// the store provides a good abstraction though the DB. If so then probably want to refactor to have
// something like field.bind(store)

import Field from './field';
// import DocStore from '../doc-store';
import globals from '../globals';
import Mapa from '../mapa';
import uuid from 'uuid';
import InfiniteLoader from '../infinite-loader';
import Component from '../component';
import utils from '../utils';

export default class FormsField extends Field {
  // // TODO: how does this get cleaned up?
  // _bubbleUpChanges() {
  //   this._docs.on('change', change => {
  //     this._emitChange('change', change);
  //   });
  // }

  _listenForLoad() {
    this.on('load', async () => {
      const form = this.get('form');
      if (form) {
        form.emitLoad();
      }
    });
  }

  _listenForLoaded() {
    this.on('loaded', async () => {
      // Wait for loaded event so that we have had a chance to load options, etc...

      this._resetInfiniteLoader();

      this._updateInfiniteLoader();

      await this._infiniteLoader.getAll();
    });
  }

  _listenForUnload() {
    this.on('unload', async () => {
      this.set({ order: null });

      const form = this.get('form');
      if (form) {
        form.emitUnload();
      }
    });
  }

  _resetInfiniteLoader() {
    this._infiniteLoader.reset();
  }

  _updateInfiniteLoader() {
    this._infiniteLoader.setShowArchived(this.get('showArchived'));
    this._infiniteLoader.setWhere(this._where);
    this._infiniteLoader.setOrder(this.get('order'));
  }

  async _clearAndGetAll() {
    // Clear any existing forms. TODO: it would be more efficient to just record ids of all
    // existing items and then use getAll() result to determine if item needs to be inserted or
    // removed (if current id missing)
    this._forms.clear();

    this._resetInfiniteLoader();

    this._updateInfiniteLoader();

    await this._infiniteLoader.getAll();
  }

  _listenForShowArchived() {
    this.on('showArchived', async showArchived => {
      this.set({ showArchived });

      await this._clearAndGetAll();
    });
  }

  _toWhereFromSearchString() {
    if (this.get('searchString')) {
      const form = this.get('form');
      const fieldNames = [];
      form.eachField(field => {
        // TODO: is it really best to filter by hidden? Better to filter by default? Or, by hidden is
        // good and expect user to specify fields if different?
        if (!field.get('hidden') && !form.isDefaultField(field.get('name'))) {
          fieldNames.push('fieldValues.' + field.get('name'));
        }
      });
      return utils.toWhereFromSearchString(
        fieldNames,
        this.get('searchString')
      );
    } else {
      return null;
    }
  }

  _listenForSearchString() {
    this.on('searchString', async searchString => {
      this.set({ searchString });

      this._where = this._toWhereFromSearchString();

      // Is the component still loaded? We want to prevent issuing a new query when the searchString
      // is cleared when we change our route.
      if (this.isLoaded()) {
        await this._clearAndGetAll();
      }
    });
  }

  // TODO: would it be better to intercept set({ order }), etc... instead of using listeners?
  _listenForOrder() {
    this.on('order', async order => {
      this.set({ order });

      // Is the component still loaded? We want to prevent issuing a new query when the order
      // is cleared when we change our route.
      if (this.isLoaded()) {
        await this._clearAndGetAll();
      }
    });
  }

  _listenForScroll() {
    this.on('scroll', () => {
      this._infiniteLoader.scroll({ scrollY: window.scrollY });
    });
  }

  _createInfiniteLoader() {
    this._infiniteLoader = new InfiniteLoader({
      onGetAll: async props => {
        const store = this.get('store');
        if (store) {
          const response = await store.getAll(props);
          return response.data.records;
        }
      },
      onGetItemsPerPage: () => {
        return this.get('itemsPerPage');
      },
      onGetScrollThreshold: () => {
        return this.get('scrollThreshold');
      },
      onGetMaxBufferPages: () => {
        return this.get('maxBufferPages');
      },
      onGetItemElement: id => {
        return document.getElementById(this.getUniqueItemId(id));
      },
      onGetSpacerElement: () => {
        return document.getElementById(this.get('spacerId'));
      },
      onRemoveItems: (id, n, reverse) => {
        let i = 0;
        let lastId = null;
        for (const entry of this._forms.entries(id, reverse)) {
          lastId = entry[0];
          if (i++ === n) {
            break;
          }

          // We want to mute the changes or else we'll introduce a lot of latency on the UI thread.
          const muteChange = true;
          this.removeForm(lastId, muteChange);
        }
        return lastId;
      },
      onGetItems: (id, reverse) => {
        return this._forms.values(id, reverse);
      },
      onResizeSpacer: (dHeight, height) => {
        let newHeight = null;

        // Was an absolute height specified?
        if (height !== undefined) {
          newHeight = height;
        } else {
          // Change by a delta
          newHeight = this.get('spacerHeight') + dHeight;
        }

        // this._infiniteLoader may not exist yet
        const beginning = this._infiniteLoader
          ? this._infiniteLoader.beginningLoaded()
          : false;

        let surplus = 0;

        if (beginning && dHeight < 0) {
          // When switch expanding the screen and then scrolling up, the spacer may be lager than
          // the space needed. This is fine until we reach the top at which point we need to set the
          // height of the spacer to 0 and then scroll to account for the offset.
          surplus = -newHeight;
          newHeight = 0;
        } else if (newHeight < 0) {
          surplus = -newHeight;
          newHeight = 0;
        }

        this.set({ spacerHeight: newHeight });

        // The spacer has no more space (probably because the screen shrinked) so we need to scroll
        // to make sure that the user stays at the same point in the list when the new items are
        // added at the top.
        if (surplus !== 0) {
          window.scrollBy({
            top: surplus,
            behavior: 'instant'
          });
        }
      },
      onSetBufferTopId: bufferTopId => {
        this.set({ bufferTopId });
      },
      onGetItem: id => {
        return this._forms.get(id);
      },
      onGetItemId: form => {
        return form.getValue('id');
      },
      onGetItemCursor: form => {
        return form.get('cursor');
      },
      onAddItem: (edge, beforeKey) => {
        const values = { id: edge.node.id };

        const form = this.get('form');

        form.eachField(field => {
          // Field exists in returned records?
          const val = edge.node.fieldValues[field.get('name')];
          if (val) {
            values[field.get('name')] = val;
          }
        });

        // We want to mute the changes until we are done adding all the forms or else we'll
        // introduce a lot of latency on the UI thread.
        const muteChange = true;
        this.addForm(
          values,
          edge.node.archivedAt,
          edge.node.userId,
          muteChange,
          edge.cursor,
          beforeKey
        );
      },
      onEmitChange: records => {
        this._emitChange('change', records);
      },
      onSetIsLoading: isLoading => {
        this.set({ isLoading });
      }
    });
  }

  _create(props) {
    this._setDefaults(props, {
      scrollThreshold: 1000,

      // We want this to be a multiple of 4 as we may make it optional to have 4 columns in
      // FormsField
      itemsPerPage: 20,

      maxBufferPages: 3,
      spacerHeight: 0,
      spacerId: Component.getNextUniqueId()
    });

    this._createInfiniteLoader();

    // We use a Mapa instead of an array as it allows us to index the forms by id. We use a Mapa
    // instead of a Map as we may want to iterate through the forms beginning at any single form.
    this._forms = new Mapa();

    super._create(props);

    this._listenForLoad();
    this._listenForLoaded();
    this._listenForUnload();
    this._listenForShowArchived();
    this._listenForSearchString();
    this._listenForOrder();
    this._listenForScroll();
  }

  // constructor(props) {
  //   super(props);
  //
  //   // // TODO: should _docs be a reference that is passed in so that the store can be swapped out?
  //   // this._docs = new DocStore();
  //
  //   // this._bubbleUpChanges();
  // }

  _listenForChanges(form) {
    form.on('value', () => {
      // TODO: does it cause problems that we are just emitting the even and not a value? If we can
      // get away with this then our logic can remain simple and performant for when there is a lot
      // of data. If not, we'll need to do something like add the concept of getIndex() to Mapa so
      // that we can do directly replace the array item in this field's value. Another option is
      // track the reference to the value in the values array here and set it here.
      this._emitChange('value');
    });
  }

  _listenToForm(form) {
    const props = ['dirty', 'touched'];
    props.forEach(prop => {
      form.on(prop, value => {
        if (value === true) {
          // We only set the parent value when it is true as want to avoid infinite recursion
          this.set({ [prop]: value });
        }
      });
    });
  }

  // TODO: refactor to use named parameters
  addForm(values, archivedAt, userId, muteChange, cursor, beforeKey) {
    const clonedForm = this.get('form').clone();

    // Reset form as there may be existing data, errors, etc...
    clonedForm.reset();

    clonedForm.setValues(values);

    clonedForm.set({ parent: this });

    const id = clonedForm.getField('id');
    let key = 0;
    if (id.isBlank()) {
      // The id value is blank so use the current _forms length as the key
      key = this._forms.length();
    } else {
      key = id.getValue();
    }

    clonedForm.set({ archivedAt, userId, cursor });

    this._forms.set(key, clonedForm, beforeKey);

    this._listenToForm(clonedForm);

    if (!muteChange) {
      // Emit change so that UI is notified
      this._emitChange('change', values);
    }
  }

  _clearAllFormListeners() {
    this.eachForm(form => form.removeAllListeners());
  }

  _validateValueType(value) {
    let hasError = false;

    if (value === null) {
      // No error
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] !== 'object') {
        hasError = true;
      } else {
        // No error
      }
    } else {
      hasError = true;
    }

    this._hasTypeError = hasError;
  }

  _setValue(value) {
    this._validateValueType(value);
    if (!this._hasTypeError) {
      // TODO: what's the best way to set? e.g. if we set the same values over and over then we end
      // up recreating the forms each time. Would it be better to just use index to set and if there
      // are indexes that are in the current forms, but not in values then just delete?
      this._clearAllFormListeners(); // prevent listener leaks
      this._forms.clear();
      if (value && value.length > 0) {
        value.forEach(values => this.addForm(values));
      }
    }
  }

  removeForm(id, muteChange) {
    if (!muteChange) {
      // Inform the InfiniteLoader that we are removing an item so that it can adjust it's buffer,
      // etc...
      this._infiniteLoader.removeItem(id);
    }

    const form = this._forms.get(id);
    form.removeAllListeners();
    this._forms.delete(id);

    if (!muteChange) {
      // Emit change so that UI is notified
      this._emitChange('change', form.getValues());
    }
  }

  getForm(id) {
    return this._forms.get(id);
  }

  eachForm(onForm) {
    this._forms.each((form, id, last) => onForm(form, id, last));
  }

  _setForAllForms(props) {
    this.eachForm(form => form.set(props));
  }

  _setOnAllForms(props, propNames, expValue) {
    propNames.forEach(name => {
      if (
        props[name] !== undefined &&
        (expValue === undefined || props[name] === expValue)
      ) {
        this._setForAllForms({ [name]: props[name] });
      }
    });
  }

  prepareForm(form) {
    form.setTouched(false);
    form.clearErrs();
    form.setDirty(false);
  }

  _setCurrentForm(props) {
    if (
      props.currentForm !== undefined &&
      props.currentForm !== this._currentForm
    ) {
      const form = this.get('form');
      if (props.currentForm === null) {
        form.clearValues();
        form.set({ userId: null });
        this.prepareForm(form);
      } else {
        // We get the values and userId as currentForm may actually be form
        const currentForm = props.currentForm;
        const values = currentForm.getValues();
        const userId = currentForm.get('userId');
        const archivedAt = currentForm.get('archivedAt');
        form.clearValues();
        form.setValues(values);
        form.set({ userId, archivedAt });
        this.prepareForm(form);
        this._set('currentForm', currentForm);
      }
    }
  }

  _readMode() {
    const form = this.get('form');
    form.emitChange('beginRead', form.getValue('id'));
    form.setEditable(false);
  }

  _createMode() {
    const form = this.get('form');
    form.emitChange('beginCreate');
    form.setEditable(true);
  }

  _updateMode() {
    const form = this.get('form');
    form.emitChange('beginUpdate', form.getValue('id'));
    form.setEditable(true);
  }

  _emitEndEvents() {
    const form = this.get('form');
    const id = form.getValue('id');
    switch (this._mode) {
      case 'create':
        form.emitChange('endCreate', id);
        break;

      case 'update':
        form.emitChange('endUpdate', id);
        break;

      default:
        // case 'read':
        form.emitChange('endRead', id);
        break;
    }
  }

  _setMode(props) {
    if (props.mode !== undefined && props.mode !== this._mode) {
      // Has a previous mode?
      if (this._mode) {
        this._emitEndEvents();
      }

      // Note: we set the parent here instead of in set() as otherwise we create a circular
      // dependency that the Compiler doesn't support.
      const form = this.get('form');
      form.set({ parent: this });

      switch (props.mode) {
        case 'create':
          this._createMode();
          break;

        case 'update':
          this._updateMode();
          break;

        case 'read':
          this._readMode();
          break;

        default:
          break;
      }
      this._set('mode', props.mode);
    }
  }

  set(props) {
    super.set(props);

    if (props.value !== undefined) {
      this._setValue(props.value);
    }

    // Set properties on all forms
    this._setOnAllForms(props, ['disabled', 'editable', 'pristine']);

    // Only set properties of forms if property is false
    this._setOnAllForms(props, ['dirty', 'touched'], false);

    // Only set properties of forms if property is null
    this._setOnAllForms(props, ['err'], null);

    this._setIfUndefined(
      props,
      'form',
      'forbidCreate',
      'forbidUpdate',
      'forbidDelete',
      'minSize',
      'maxSize',
      'singularLabel',
      'store',
      'scrollThreshold',
      'itemsPerPage',
      'maxBufferPages',
      'spacerHeight',
      'spacerId',
      'bufferTopId',
      'isLoading',
      'order'
    );

    this._setCurrentForm(props);

    this._setMode(props);
  }

  _getValue() {
    return this._forms.map(form => {
      return form.getValues();
    });
  }

  getOne(name) {
    if (name === 'value') {
      return this._getValue();
    }

    const value = this._getIfAllowed(
      name,
      'form',
      'forbidCreate',
      'forbidUpdate',
      'forbidDelete',
      'minSize',
      'maxSize',
      'singularLabel',
      'store',
      'scrollThreshold',
      'itemsPerPage',
      'maxBufferPages',
      'spacerHeight',
      'spacerId',
      'bufferTopId',
      'isLoading',
      'order',
      'currentForm',
      'mode'
    );
    return value === undefined ? super.getOne(name) : value;
  }

  // getStore() {
  //   return this._docs;
  // }

  *getForms() {
    yield* this._forms.values();
  }

  async _saveForm(form) {
    // await this._docs.set(form.getValues());
    const id = form.getField('id');
    const store = this.get('store');
    const creating = id.isBlank();
    if (store) {
      // New?
      if (creating) {
        const response = await store.create({ form });
        id.setValue(response.data.createRecord.id);
        form.set({ userId: response.data.createRecord.userId });
      } else {
        // Existing
        await store.update({ form, id: id.getValue() });
      }
    } else if (creating) {
      // TODO: use the id from this._docs.set instead of this dummy id
      id.setValue(uuid.v4());
    }

    if (this._forms.has(id.getValue())) {
      const fieldForm = this._forms.get(id.getValue());
      fieldForm.setValues(form.getValues());
      fieldForm.set({
        archivedAt: form.get('archivedAt'),
        userId: form.get('userId'),
        cursor: form.get('cursor')
      });
    } else {
      this.addForm(
        form.getValues(),
        null,
        form.get('userId'),
        false,
        form.get('cursor')
      );
    }

    form.emitChange(
      creating ? 'didCreateRecord' : 'didUpdateRecord',
      id.getValue()
    );

    globals.displaySnackbar(this.getSingularLabel() + ' saved');
  }

  async save() {
    const form = this.get('form');

    // No errors?
    form.setTouched(true);
    form.validate();
    if (form.getErrs().length === 0) {
      await this._saveForm(form);
      this.set({ mode: 'read' });
    }
  }

  async archive(form) {
    // await this._docs.delete(form.getField('id').getValue());

    const store = this.get('store');
    if (store) {
      const archive = await store.archive({ form, id: form.getValue('id') });
      form.set({ archivedAt: archive.data.archiveRecord.archivedAt });
    }

    // // Not showing archived?
    // if (!this.get('showArchived')) {

    // Remove from list
    this.removeForm(form.getValue('id'));

    // }

    form.emitChange('didArchiveRecord', form.getValue('id'));

    globals.displaySnackbar(this.getSingularLabel() + ' deleted');
  }

  async restore(form) {
    const store = this.get('store');
    if (store) {
      await store.restore({ form, id: form.getValue('id') });
    }

    form.set({ archivedAt: null });

    // Remove from list
    this.removeForm(form.getValue('id'));

    form.emitChange('didRestoreRecord', form.getValue('id'));

    globals.displaySnackbar(this.getSingularLabel() + ' restored');
  }

  reachedMax() {
    const maxSize = this.get('maxSize');
    return maxSize !== null && this._forms.length() >= maxSize;
  }

  validate() {
    super.validate();

    let errors = [];
    for (const form of this._forms.values()) {
      form.validate();
      if (form.hasErr()) {
        errors.push({
          id: form.getField('id').getValue(),
          error: form.getErrs()
        });
      }
    }

    const numForms = this._forms.length();

    const minSize = this.get('minSize');
    const maxSize = this.get('maxSize');

    if (minSize !== null && numForms < minSize) {
      errors.push({
        error: `${minSize} or more`
      });
    } else if (maxSize !== null && numForms > maxSize) {
      errors.push({
        error: `${maxSize} or less`
      });
    }

    if (this._hasTypeError) {
      errors.push({ error: 'must be an array of objects' });
    }

    if (errors.length > 0) {
      this.setErr(errors);
    }
  }

  getSingularLabel() {
    if (this.get('singularLabel')) {
      return this.get('singularLabel');
    } else {
      // Automatically calculate singular label by removing last 's'
      const label = this.get('label');
      return label.substr(0, label.length - 1);
    }
  }

  isBlank() {
    let isBlank = true;
    for (const form of this.getForms()) {
      if (!form.isBlank()) {
        isBlank = false;
        break;
      }
    }
    return isBlank;
  }

  clone() {
    const clonedField = super.clone();

    // Clone form so that cloned form has a reference to a different form
    this.set({ form: this.get('form').clone() });

    return clonedField;
  }

  getUniqueItemId(id) {
    return this.getUniqueId() + '-item-' + id;
  }
}
