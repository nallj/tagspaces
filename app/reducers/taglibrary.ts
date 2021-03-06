/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */
import uuidv1 from 'uuid';
import { immutablySwapItems, formatDateTime4Tag, extend } from '-/utils/misc';
import { saveAsTextFile } from '-/services/utils-io';
import versionMeta from '../version.json';
import defaultTagLibrary from './taglibrary-default';
import AppConfig from '../config';
import { TS } from '-/tagspaces.namespace';

export const types = {
  CREATE_TAGGROUP: 'CREATE_TAGGROUP',
  IMPORT_TAGGROUP: 'IMPORT_TAGGROUP',
  IMPORT_OLD_TAGGROUP: 'IMPORT_OLD_TAGGROUP',
  ADD_TAGGROUP: 'ADD_TAGGROUP',
  MERGE_TAGGROUP: 'MERGE_TAGGROUP',
  REMOVE_TAGGROUP: 'REMOVE_TAGGROUP',
  UPDATE_TAGGROUP: 'UPDATE_TAGGROUP',
  // TOGGLE_TAGGROUP: 'TOGGLE_TAGGROUP',
  ADD_TAG: 'ADD_TAG',
  COPY_TAG: 'COPY_TAG',
  REMOVE_TAG: 'REMOVE_TAG',
  UPDATE_TAG: 'UPDATE_TAG',
  SORT_TAG_GROUP_UP: 'SORT_TAG_GROUP_UP',
  MOVE_TAG_GROUP_UP: 'MOVE_TAG_GROUP_UP',
  MOVE_TAG_GROUP_DOWN: 'MOVE_TAG_GROUP_DOWN',
  EDIT_TAG_COLOR: 'EDIT_TAG_COLOR',
  MOVE_TAG: 'MOVE_TAG'
};

export default (state: Array<TS.TagGroup> = defaultTagLibrary, action: any) => {
  switch (action.type) {
    case types.CREATE_TAGGROUP: {
      return [
        ...state,
        {
          uuid: uuidv1(),
          title: action.entry.title,
          color: action.entry.color,
          textcolor: action.entry.textcolor,
          children: [],
          created_date: new Date(),
          modified_date: new Date()
        }
      ];
    }
    case types.ADD_TAGGROUP: {
      let indexForEditing = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.entry.uuid) {
          indexForEditing = index;
        }
      });
      if (indexForEditing >= 0) {
        return [
          ...state.slice(0, indexForEditing),
          {
            uuid: action.entry.uuid,
            title: action.entry.title,
            children: [
              ...state[indexForEditing].children,
              action.entry.children[0]
            ],
            created_date: new Date(),
            modified_date: new Date()
          },
          ...state.slice(indexForEditing + 1)
        ];
      }
      return state;
    }
    case types.MERGE_TAGGROUP: {
      const indexForEditing = state.findIndex(
        obj => obj.uuid === action.entry.uuid
      );
      if (indexForEditing >= 0) {
        const tags = [
          ...state[indexForEditing].children,
          ...action.entry.children
        ];
        tags.splice(0, tags.length - AppConfig.maxCollectedTag);
        return [
          ...state.slice(0, indexForEditing),
          {
            uuid: action.entry.uuid,
            title: action.entry.title,
            children: tags,
            created_date: action.entry.created_date,
            modified_date: new Date()
          },
          ...state.slice(indexForEditing + 1)
        ];
      }
      return [
        ...state,
        {
          uuid: action.entry.uuid || uuidv1(),
          title: action.entry.title,
          color: action.entry.color,
          textcolor: action.entry.textcolor,
          children: action.entry.children,
          created_date: new Date(),
          modified_date: new Date()
        }
      ];
    }
    case types.UPDATE_TAGGROUP: {
      let indexForEditing = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.entry.uuid) {
          indexForEditing = index;
        }
      });

      if (indexForEditing >= 0) {
        const modifiedEntry = extend(
          { created_date: new Date() },
          action.entry,
          { modified_date: new Date() }
        );
        return [
          ...state.slice(0, indexForEditing),
          modifiedEntry,
          ...state.slice(indexForEditing + 1)
        ];
      }
      return state;
    }
    case types.REMOVE_TAGGROUP: {
      let indexForRemoving = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          indexForRemoving = index;
        }
      });
      if (indexForRemoving >= 0) {
        return [
          ...state.slice(0, indexForRemoving),
          ...state.slice(indexForRemoving + 1)
        ];
      }
      return state;
    }
    case types.ADD_TAG: {
      let indexForEditing = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          indexForEditing = index;
        }
      });

      if (indexForEditing >= 0) {
        let tags = action.tag
          .split(' ')
          .join(',')
          .split(','); // handle spaces around commas
        tags = [...new Set(tags)]; // remove duplicates
        tags = tags.filter(tag => tag && tag.length > 0); // zero length tags

        const taggroupTags = state[indexForEditing].children;
        taggroupTags.forEach(tag => {
          // filter out duplicated tags
          tags = tags.filter(e => e !== tag.title);
        });
        return [
          ...state.slice(0, indexForEditing),
          {
            ...state[indexForEditing],
            children: taggroupTags.concat(
              tags.map(tagTitle => ({
                type:
                  taggroupTags.length > 0 ? taggroupTags[0].type : 'sidecar',
                title: tagTitle.trim(),
                functionality: '',
                description: '',
                icon: '',
                color: state[indexForEditing].color
                  ? state[indexForEditing].color
                  : action.defaultTagBackgroundColor,
                textcolor: state[indexForEditing].textcolor
                  ? state[indexForEditing].textcolor
                  : action.defaultTagTextColor,
                style: taggroupTags.length > 0 ? taggroupTags[0].style : '',
                created_date: new Date(),
                modified_date: new Date()
              }))
            )
          },
          ...state.slice(indexForEditing + 1)
        ];
      }
      return state;
    }
    case types.COPY_TAG: {
      let indexForEditing = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          indexForEditing = index;
        }
      });

      if (indexForEditing >= 0) {
        const taggroupTags = state[indexForEditing].children;
        const copyTag = action.tag;
        if (!taggroupTags.some(tag => tag.title === copyTag.title)) {
          return [
            ...state.slice(0, indexForEditing),
            {
              ...state[indexForEditing],
              children: [...taggroupTags, copyTag]
            },
            ...state.slice(indexForEditing + 1)
          ];
        }
      }
      return state;
    }
    case types.UPDATE_TAG: {
      let tagIndexForUpdating = -1;
      let tagGroupIndexForUpdating = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          tagGroup.children.forEach((tag, tagIndex) => {
            if (tag.title === action.origTitle) {
              tagIndexForUpdating = tagIndex;
              tagGroupIndexForUpdating = index;
            }
          });
        }
      });
      if (tagIndexForUpdating >= 0) {
        const modifiedEntry = extend({ created_date: new Date() }, action.tag, {
          modified_date: new Date()
        });
        return [
          ...state.slice(0, tagGroupIndexForUpdating),
          {
            ...state[tagGroupIndexForUpdating],
            children: [
              ...state[tagGroupIndexForUpdating].children.slice(
                0,
                tagIndexForUpdating
              ),
              modifiedEntry,
              ...state[tagGroupIndexForUpdating].children.slice(
                tagIndexForUpdating + 1
              )
            ]
          },
          ...state.slice(tagGroupIndexForUpdating + 1)
        ];
      }
      return state;
    }
    case types.REMOVE_TAG: {
      let tagIndexForRemoving = -1;
      let tagGroupIndexForEditing = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          tagGroup.children.forEach((tag, tagIndex) => {
            if (tag.title === action.tagTitle) {
              tagIndexForRemoving = tagIndex;
              tagGroupIndexForEditing = index;
            }
          });
        }
      });
      if (tagIndexForRemoving >= 0) {
        return [
          ...state.slice(0, tagGroupIndexForEditing),
          {
            ...state[tagGroupIndexForEditing],
            children: [
              ...state[tagGroupIndexForEditing].children.slice(
                0,
                tagIndexForRemoving
              ),
              ...state[tagGroupIndexForEditing].children.slice(
                tagIndexForRemoving + 1
              )
            ]
          },
          ...state.slice(tagGroupIndexForEditing + 1)
        ];
      }
      return state;
    }
    case types.MOVE_TAG_GROUP_DOWN: {
      let indexForUpdating = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          indexForUpdating = index;
        }
      });
      if (indexForUpdating >= 0 && indexForUpdating < state.length - 1) {
        const secondIndex = indexForUpdating + 1;
        return immutablySwapItems(state, indexForUpdating, secondIndex);
      }
      return state;
    }
    case types.MOVE_TAG_GROUP_UP: {
      let indexForUpdating = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          indexForUpdating = index;
        }
      });
      if (indexForUpdating > 0) {
        const secondIndex = indexForUpdating - 1;
        return immutablySwapItems(state, indexForUpdating, secondIndex);
      }
      return state;
    }
    case types.SORT_TAG_GROUP_UP: {
      let indexForUpdating = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.uuid) {
          indexForUpdating = index;
        }
      });
      if (indexForUpdating >= 0) {
        return [
          ...state.slice(0, indexForUpdating),
          {
            ...state[indexForUpdating],
            children: state[indexForUpdating].children.sort((a, b) =>
              a.title > b.title ? 1 : a.title < b.title ? -1 : 0
            )
          },
          ...state.slice(indexForUpdating + 1)
        ];
      }
      return state;
    }
    case types.MOVE_TAG: {
      let tagIndexForRemoving = -1;
      let indexFromGroup = -1;
      let indexToGroup = -1;
      state.forEach((tagGroup, index) => {
        if (tagGroup.uuid === action.fromTagGroupId) {
          indexFromGroup = index;
        }
        if (tagGroup.uuid === action.toTagGroupId) {
          indexToGroup = index;
        }
      });
      if (indexFromGroup >= 0 && state[indexFromGroup].children) {
        state[indexFromGroup].children.forEach((tag, tagIndex) => {
          if (tag.title === action.tagTitle) {
            tagIndexForRemoving = tagIndex;
          }
          return true;
        });
      }
      if (indexToGroup >= 0 && indexToGroup >= 0 && tagIndexForRemoving >= 0) {
        const newTagLibrary = [...state];
        const tag = { ...state[indexFromGroup].children[tagIndexForRemoving] };
        const found = newTagLibrary[indexToGroup].children.find(
          t => t.title === tag.title
        );
        if (!found) {
          newTagLibrary[indexToGroup].children.push(tag);
          newTagLibrary[indexFromGroup].children = [
            ...newTagLibrary[indexFromGroup].children.slice(
              0,
              tagIndexForRemoving
            ),
            ...newTagLibrary[indexFromGroup].children.slice(
              tagIndexForRemoving + 1
            )
          ];
          return newTagLibrary;
        }
        console.warn(
          'Tag with this title already exists in the target tag group'
        );
      }
      return state;
    }
    case types.IMPORT_TAGGROUP: {
      const arr = action.replace ? [] : [...state];
      console.log(arr);
      if (action.entry[0].key) {
        action.entry.forEach((tagGroup, index) => {
          // migration of old tag groups 2.9 or less in the new version 3.0-present
          // @ts-ignore
          if (tagGroup.key === state.uuid || tagGroup.key !== state.uuid) {
            tagGroup = {
              title: tagGroup.title,
              uuid: tagGroup.key,
              children: tagGroup.children
            };
            const tagsArr = [];
            tagGroup.children.forEach(tag => {
              tagsArr.push(tag);
              tagGroup.children = tagsArr;
              arr.push(tagGroup);
            });
          }
        });
      } else {
        action.entry.forEach(tagGroup => {
          const index = arr.findIndex(obj => obj.uuid === tagGroup.uuid);
          if (index > -1) {
            tagGroup.children.forEach(tag => {
              const stateTag = arr[index].children.find(
                obj => obj.title === tag.title
              );
              if (stateTag === undefined) {
                arr[index].children.push(tag);
              }
            });
          } else {
            arr.push(tagGroup);
          }
        });
      }

      return arr;
    }
    default: {
      return state;
    }
  }
};

export const actions = {
  createTagGroup: (entry: TS.TagGroup) => ({
    type: types.CREATE_TAGGROUP,
    entry
  }),
  editTagGroup: (entry: TS.TagGroup) => ({
    type: types.UPDATE_TAGGROUP,
    entry
  }),
  removeTagGroup: (parentTagGroupUuid: TS.Uuid) => ({
    type: types.REMOVE_TAGGROUP,
    uuid: parentTagGroupUuid
  }),
  addTagGroup: (entry: TS.TagGroup) => ({
    type: types.ADD_TAGGROUP,
    entry
  }),
  mergeTagGroup: (entry: TS.TagGroup) => ({
    type: types.MERGE_TAGGROUP,
    entry
  }),
  addTag: (tag: string | Object, parentTagGroupUuid: TS.Uuid) => (
    dispatch: (actions: Object) => void,
    getState: () => any
  ) => {
    const { settings } = getState();
    const { tagTextColor, tagBackgroundColor } = settings;
    // console.log('INSIDE ADD TAG');
    // console.log(tag, parentTagGroupUuid);
    if (typeof tag === 'object' && tag !== null) {
      dispatch(
        actions.copyTag(
          {
            ...tag,
            // @ts-ignore
            textcolor: tag.textcolor || tagTextColor,
            // @ts-ignore
            color: tag.color || tagBackgroundColor
          },
          parentTagGroupUuid
        )
      );
    } else {
      dispatch(
        actions.addTagIntern(
          // @ts-ignore
          tag,
          parentTagGroupUuid,
          tagTextColor,
          tagBackgroundColor
        )
      );
    }
  },
  addTagIntern: (
    tag: string,
    parentTagGroupUuid: TS.Uuid,
    defaultTagTextColor: string,
    defaultTagBackgroundColor: string
  ) => ({
    type: types.ADD_TAG,
    tag,
    uuid: parentTagGroupUuid,
    defaultTagTextColor,
    defaultTagBackgroundColor
  }),
  copyTag: (tag: TS.Tag, parentTagGroupUuid: TS.Uuid) => ({
    type: types.COPY_TAG,
    tag,
    uuid: parentTagGroupUuid
  }),
  editTag: (tag: TS.Tag, parentTagGroupUuid: TS.Uuid, origTitle: string) => ({
    type: types.UPDATE_TAG,
    tag,
    uuid: parentTagGroupUuid,
    origTitle
  }),
  deleteTag: (tagTitle: string, parentTagGroupUuid: TS.Uuid) => ({
    type: types.REMOVE_TAG,
    tagTitle,
    uuid: parentTagGroupUuid
  }),
  moveTagGroupUp: (parentTagGroupUuid: TS.Uuid) => ({
    type: types.MOVE_TAG_GROUP_UP,
    uuid: parentTagGroupUuid
  }),
  moveTagGroupDown: (parentTagGroupUuid: TS.Uuid) => ({
    type: types.MOVE_TAG_GROUP_DOWN,
    uuid: parentTagGroupUuid
  }),
  sortTagGroup: (parentTagGroupUuid: TS.Uuid) => ({
    type: types.SORT_TAG_GROUP_UP,
    uuid: parentTagGroupUuid
  }),
  moveTag: (
    tagTitle: string,
    fromTagGroupUuid: TS.Uuid,
    toTagGroupUuid: TS.Uuid
  ) => ({
    type: types.MOVE_TAG,
    tagTitle,
    fromTagGroupId: fromTagGroupUuid,
    toTagGroupId: toTagGroupUuid
  }),
  importTagGroups: (entry, replace: boolean = false) => ({
    type: types.IMPORT_TAGGROUP,
    entry,
    replace
  }),
  /**
   * GraphQL API return TagGroup Tags array like String
   * This migrate tagGroups model to children []
   * @param entries
   */
  /* addTagGroups: (entries: Array<any>) => (
    dispatch: (actions: Object) => void
  ) => {
    if (entries && entries.length > 0) {
      const tagGroups: Array<TagGroup> = entries.map(tagGroup => {
        const { children, ...tagGroupProps } = tagGroup;
        return { children: JSON.parse(children), ...tagGroupProps };
      });
      dispatch(actions.importTagGroups(tagGroups, true));
    }
  }, */
  exportTagGroups: (entry: Array<Object>) => (
    dispatch: (actions: Object) => void,
    getState: () => any
  ) => {
    const { settings } = getState();
    const tagLibrary = entry;
    const jsonFormat =
      '{ "appName": "' +
      versionMeta.name +
      '", "appVersion": "' +
      versionMeta.version +
      '", "settingsVersion": ' +
      settings.settingsVersion +
      ', "tagGroups": ';
    const getAllTags = [];
    tagLibrary.forEach(value => {
      getAllTags.push(value);
    });

    const blob = new Blob([jsonFormat + JSON.stringify(getAllTags) + '}'], {
      type: 'application/json'
    });
    const dateTimeTag = formatDateTime4Tag(new Date(), true);
    saveAsTextFile(blob, 'tag-library [tagspaces ' + dateTimeTag + '].json');
    console.log('Tag library exported...');
  }
};

// Selectors
export const getTagGroups = (state: any) => state.taglibrary;
export const getAllTags = (state: any) => {
  const uniqueTags: Array<TS.Tag> = [];
  state.taglibrary.forEach(tagGroup => {
    tagGroup.children.forEach(tag => {
      const found = uniqueTags.find(uTag => uTag.title === tag.title);
      if (!found) {
        uniqueTags.push(tag);
      }
    });
  });
  return uniqueTags.sort((a, b) =>
    a.title > b.title ? 1 : a.title < b.title ? -1 : 0
  );
};

export const getTagColors = (allTags: Array<TS.Tag>, tagTitle: string) => {
  const tagColors = {
    textcolor: '',
    color: ''
  };
  allTags.forEach((tag: TS.Tag) => {
    if (tag.title === tagTitle) {
      tagColors.textcolor = tag.textcolor;
      tagColors.color = tag.color;
    }
  });
  return tagColors;
};
