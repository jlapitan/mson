// Timestamps are set in the store as some stores, e.g. those backed by remote databases, may wish
// to manage the timestamps for better reliability.
//
// Structure of doc in a store, e.g.
//  {
//     id,
//     userId,
//     ...,
//     fieldValues: {
//       firstName,
//       lastName,
//       ...
//     }
//   }
// In other words, we nest the default fields in the root of the document and then nest the
// non-default fields in fieldValues. This is done because:
//   1. There are some properties, like the cursor, which should not be a field as they shouldn't be
//      displayed to the user. However, these fields need to be associated with the form.
//   2. It allows for the creation of extra properties in the future without adding them to the form
//      as default fields
//   3. Default fields are not included in the fieldValues as this allows the default fields,
//      especially the id to be at the root of the record and not nested in the fieldValues. We also
//      don’t want to duplicate these default fields in both the root of the record and in the field
//      values as this can waste memory when storing the data

import Component from '../component';
import access from '../access';
import utils from '../utils';
import uberUtils from '../uber-utils';

export default class Store extends Component {
  _className = 'Store';

  _create(props) {
    super._create(props);

    // For mocking
    this._access = access;

    if (!props || !props.muteDidLoad) {
      this._emitDidLoad();
    }
  }

  async _tryAndHandleError(promiseFactory) {
    return uberUtils.tryAndDisplayErrorIfAPIError(promiseFactory);
  }

  async createDoc(props) {
    return this._tryAndHandleError(() => {
      // Omit values based on access
      const fieldValues = this._access.valuesCanCreate(props.form, {
        default: false
      });

      const id = props.form.getValue('id');

      return this._createDoc({ ...props, fieldValues, id });
    });
  }

  async getDoc(props) {
    return this._tryAndHandleError(async () => {
      if (props.id) {
        return this._getDoc(props);
      } else {
        // Reuse the logic in _getAllDocs to query with "where" and return the first doc
        const docs = await this._getAllDocs({ ...props, showArchived: null });
        return docs.edges.length > 0 ? docs.edges[0].node : null;
      }
    });
  }

  async getAllDocs(props) {
    return this._tryAndHandleError(() => {
      return this._getAllDocs(props);
    });
  }

  async _upsertDoc(props) {
    const id = props.form.getValue('id');

    let exists = false;

    if (id) {
      exists = await this._hasDoc({ id });
    }

    if (exists) {
      return this.updateDoc({ ...props, id });
    } else {
      return this.createDoc(props);
    }
  }

  async upsertDoc(props) {
    return this._tryAndHandleError(() => {
      return this._upsertDoc(props);
    });
  }

  async updateDoc(props) {
    return this._tryAndHandleError(() => {
      // Omit values based on access
      const fieldValues = this._access.valuesCanUpdate(props.form, {
        default: false
      });

      return this._updateDoc({ ...props, fieldValues });
    });
  }

  async archiveDoc(props) {
    return this._tryAndHandleError(() => {
      return this._archiveDoc(props);
    });
  }

  async restoreDoc(props) {
    return this._tryAndHandleError(() => {
      return this._restoreDoc(props);
    });
  }

  _emitError(err) {
    this.emitChange('err', err);
  }

  _now() {
    return new Date();
  }

  _buildDoc({ fieldValues, id, userId }) {
    const createdAt = this._now();

    return {
      id: id ? id : utils.uuid(),
      archivedAt: null, // Needed by the UI as a default
      createdAt,
      updatedAt: createdAt,
      userId: userId ? userId : null,
      fieldValues
    };
  }

  _setDoc({ doc, fieldValues, archivedAt }) {
    if (fieldValues !== undefined) {
      // Merge so that we support partial updates
      doc.fieldValues = Object.assign(doc.fieldValues, fieldValues);
    }

    if (archivedAt !== undefined) {
      doc.archivedAt = archivedAt;
    }

    doc.updatedAt = this._now();

    return doc;
  }
}
